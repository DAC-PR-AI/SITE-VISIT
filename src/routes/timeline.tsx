import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { listBookings, listDepartments, listProjects } from "@/lib/sheets.functions";
import { TimelineView } from "@/components/timeline-view";

const bookingsQO = queryOptions({ queryKey: ["bookings"], queryFn: () => listBookings() });
const projectsQO = queryOptions({ queryKey: ["projects"], queryFn: () => listProjects() });
const departmentsQO = queryOptions({ queryKey: ["departments"], queryFn: () => listDepartments() });

export const Route = createFileRoute("/timeline")({
  head: () => ({
    meta: [
      { title: "Timeline — Visitly" },
      { name: "description", content: "Horizontal day timeline of every site visit across all projects." },
      { property: "og:title", content: "Timeline — Visitly" },
      { property: "og:description", content: "Horizontal day timeline of every site visit across all projects." },
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(bookingsQO);
    context.queryClient.ensureQueryData(projectsQO);
    context.queryClient.ensureQueryData(departmentsQO);
  },
  component: TimelinePage,
});

function TimelinePage() {
  const bookings = useSuspenseQuery(bookingsQO).data;
  const projects = useSuspenseQuery(projectsQO).data;
  const departments = useSuspenseQuery(departmentsQO).data;
  return (
    <div className="mx-auto max-w-[1400px] px-6 py-8 md:py-10 space-y-6">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Schedule</p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">Timeline</h1>
        <p className="mt-1 text-muted-foreground">Navigate through days and click any block to see full booking details.</p>
      </header>
      <TimelineView bookings={bookings} projectNames={projects.map((p) => p.ProjectName)} departments={departments} />
    </div>
  );
}