import { ReferralsList } from "@/components/tenant/consultant/referrals/referrals-list";
import { getConsultantReferrals } from "@/lib/api/consultant-referrals.server";

export default async function ConsultantReferralsPage() {
  const [incoming, outgoing] = await Promise.all([
    getConsultantReferrals("incoming"),
    getConsultantReferrals("outgoing"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Referrals</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Cases colleagues have referred to you, and cases you&apos;ve referred to them
        </p>
      </div>

      <ReferralsList incoming={incoming} outgoing={outgoing} />
    </div>
  );
}
