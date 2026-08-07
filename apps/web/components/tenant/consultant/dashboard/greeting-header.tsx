import { getOwnConsultantProfile } from "@/lib/api/consultants.server";

export async function GreetingHeader() {
  const consultant = await getOwnConsultantProfile();
  const date = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-2xl font-bold text-foreground">
          Good Morning{consultant ? `, ${consultant.fullName}` : ""}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{date}</p>
      </div>
    </div>
  );
}
