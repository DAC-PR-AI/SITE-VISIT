import crypto from "node:crypto";

const GOOGLE_API_BASE = "https://sheets.googleapis.com/v4";

function sheetId(): string {
  const id = process.env.GOOGLE_SHEET_ID;
  if (!id) throw new Error("GOOGLE_SHEET_ID environment variable is not set.");
  return id;
}

function base64url(str: string | Buffer): string {
  const base64 = typeof str === "string" ? Buffer.from(str).toString("base64") : str.toString("base64");
  return base64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function formatPrivateKey(key: string): string {
  let cleaned = key.trim();
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1);
  }
  cleaned = cleaned.replace(/\\n/g, "\n").replace(/\\r/g, "");
  if (!cleaned.includes("\n") && cleaned.includes("-----BEGIN PRIVATE KEY-----")) {
    cleaned = cleaned
      .replace("-----BEGIN PRIVATE KEY-----", "-----BEGIN PRIVATE KEY-----\n")
      .replace("-----END PRIVATE KEY-----", "\n-----END PRIVATE KEY-----");
  }
  return cleaned.trim();
}

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

async function getServiceAccountToken(clientEmail: string, privateKey: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedAccessToken && cachedAccessToken.expiresAt > now + 60) {
    return cachedAccessToken.token;
  }

  const formattedPrivateKey = formatPrivateKey(privateKey);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(
    JSON.stringify({
      iss: clientEmail,
      scope: "https://www.googleapis.com/auth/spreadsheets",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    }),
  );

  const signer = crypto.createSign("RSA-SHA256");
  signer.update(`${header}.${payload}`);
  const signature = base64url(signer.sign(formattedPrivateKey));

  const jwt = `${header}.${payload}.${signature}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google Service Account Auth Error (${res.status}): ${text}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedAccessToken = {
    token: data.access_token,
    expiresAt: now + (data.expires_in || 3600),
  };
  return cachedAccessToken.token;
}

async function getApiConfig() {
  const sheetIdVal = sheetId();
  const saEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL;
  const saKey = process.env.GOOGLE_PRIVATE_KEY || process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (saEmail && saKey) {
    const token = await getServiceAccountToken(saEmail, saKey);
    return {
      baseUrl: `${GOOGLE_API_BASE}/spreadsheets/${sheetIdVal}`,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      } as Record<string, string>,
      queryParams: "",
    };
  }

  const apiKey = process.env.GOOGLE_SHEETS_API_KEY || process.env.GOOGLE_API_KEY;
  const accessToken = process.env.GOOGLE_ACCESS_TOKEN || process.env.GOOGLE_SERVICE_ACCOUNT_TOKEN;

  if (!apiKey && !accessToken) {
    throw new Error(
      "Google Sheets credentials are not configured. Please set GOOGLE_SERVICE_ACCOUNT_EMAIL & GOOGLE_PRIVATE_KEY (or GOOGLE_SHEETS_API_KEY) in your environment variables.",
    );
  }

  const reqHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (accessToken) {
    reqHeaders["Authorization"] = `Bearer ${accessToken}`;
  }

  const queryParams = accessToken ? "" : `key=${encodeURIComponent(apiKey || "")}`;

  return {
    baseUrl: `${GOOGLE_API_BASE}/spreadsheets/${sheetIdVal}`,
    headers: reqHeaders,
    queryParams,
  };
}

function appendQueryParam(url: string, param: string): string {
  if (!param) return url;
  return url.includes("?") ? `${url}&${param}` : `${url}?${param}`;
}

async function handle(res: Response) {
  if (!res.ok) {
    const text = await res.text();
    console.error(`[sheets] ${res.status}: ${text}`);
    const err = new Error(`Google Sheets error (${res.status}): ${text.slice(0, 300)}`) as Error & { status?: number; body?: string };
    err.status = res.status;
    err.body = text;
    throw err;
  }
  return res.json();
}

export async function getRange(range: string): Promise<string[][]> {
  const config = await getApiConfig();
  const rawUrl = `${config.baseUrl}/values/${encodeURIComponent(range)}`;
  const url = appendQueryParam(rawUrl, config.queryParams);
  try {
    const data = await handle(await fetch(url, { headers: config.headers }));
    return (data.values ?? []) as string[][];
  } catch (e) {
    const err = e as Error & { status?: number; body?: string };
    if (err.status === 400 && /Unable to parse range/i.test(err.body || "")) {
      console.warn(`[sheets] Missing tab for range "${range}" — returning empty.`);
      return [];
    }
    throw e;
  }
}

export async function appendRow(range: string, row: (string | number)[]) {
  const config = await getApiConfig();
  const rawUrl = `${config.baseUrl}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
  const url = appendQueryParam(rawUrl, config.queryParams);
  return handle(
    await fetch(url, {
      method: "POST",
      headers: config.headers,
      body: JSON.stringify({ values: [row] }),
    }),
  );
}

export async function updateRange(range: string, row: (string | number)[]) {
  const config = await getApiConfig();
  const rawUrl = `${config.baseUrl}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
  const url = appendQueryParam(rawUrl, config.queryParams);
  return handle(
    await fetch(url, {
      method: "PUT",
      headers: config.headers,
      body: JSON.stringify({ values: [row] }),
    }),
  );
}

export async function clearRange(range: string) {
  const config = await getApiConfig();
  const rawUrl = `${config.baseUrl}/values/${encodeURIComponent(range)}:clear`;
  const url = appendQueryParam(rawUrl, config.queryParams);
  return handle(await fetch(url, { method: "POST", headers: config.headers }));
}

const TABS: Record<string, string[]> = {
  Projects: ["ProjectID", "ProjectName"],
  Units: ["ProjectID", "UnitNumber", "Availability"],
  Departments: ["Department"],
  Bookings: [
    "BookingID",
    "EmployeeName",
    "Department",
    "CustomerName",
    "MobileNumber",
    "ProjectName",
    "UnitNumber",
    "VisitDate",
    "StartTime",
    "EndTime",
    "Purpose",
    "Remarks",
    "CreatedAt",
  ],
};

const DEFAULT_DEPARTMENTS = [
  "Sales",
  "Marketing",
  "Operations",
  "Finance",
  "HR",
  "Management",
  "CRM",
];

export async function ensureTabs(): Promise<{ created: string[]; existing: string[] }> {
  const config = await getApiConfig();
  const metaUrl = appendQueryParam(`${config.baseUrl}?fields=sheets.properties.title`, config.queryParams);
  const meta = await handle(await fetch(metaUrl, { headers: config.headers }));
  const have = new Set<string>(
    (meta.sheets ?? []).map((s: { properties: { title: string } }) => s.properties.title),
  );
  const created: string[] = [];
  const existing: string[] = [];
  const requests: unknown[] = [];
  for (const name of Object.keys(TABS)) {
    if (have.has(name)) existing.push(name);
    else {
      created.push(name);
      requests.push({ addSheet: { properties: { title: name } } });
    }
  }
  if (requests.length) {
    const batchUrl = appendQueryParam(`${config.baseUrl}:batchUpdate`, config.queryParams);
    await handle(
      await fetch(batchUrl, {
        method: "POST",
        headers: config.headers,
        body: JSON.stringify({ requests }),
      }),
    );
  }
  for (const [name, cols] of Object.entries(TABS)) {
    const endCol = String.fromCharCode(64 + cols.length);
    const headerUrl = appendQueryParam(
      `${config.baseUrl}/values/${encodeURIComponent(`${name}!A1:${endCol}1`)}?valueInputOption=RAW`,
      config.queryParams,
    );
    await handle(
      await fetch(headerUrl, {
        method: "PUT",
        headers: config.headers,
        body: JSON.stringify({ values: [cols] }),
      }),
    );
  }
  const deptRows = await getRange("Departments!A2:A");
  if (deptRows.filter((r) => (r[0] ?? "").trim()).length === 0) {
    const seedUrl = appendQueryParam(
      `${config.baseUrl}/values/${encodeURIComponent("Departments!A2:A")}?valueInputOption=RAW`,
      config.queryParams,
    );
    await handle(
      await fetch(seedUrl, {
        method: "PUT",
        headers: config.headers,
        body: JSON.stringify({ values: DEFAULT_DEPARTMENTS.map((d) => [d]) }),
      }),
    );
  }
  return { created, existing };
}