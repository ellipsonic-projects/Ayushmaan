"use client";

import { useMemo, useState, type FormEvent } from "react";
import { CalendarDays, Clock3, Mail, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function BillingPage() {
	const [officeEmail, setOfficeEmail] = useState("");
	const [contactDate, setContactDate] = useState<Date | undefined>(new Date());
	const [contactTime, setContactTime] = useState("10:00");
	const [tenantName, setTenantName] = useState("");
	const [submitted, setSubmitted] = useState(false);

	const formattedDate = useMemo(() => {
		if (!contactDate) return "Select a date";
		return new Intl.DateTimeFormat("en-US", {
			weekday: "long",
			month: "long",
			day: "numeric",
			year: "numeric",
		}).format(contactDate);
	}, [contactDate]);

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setSubmitted(true);
	};

	return (
		<main className="min-h-screen bg-background text-foreground">
			<section className="border-b border-border bg-[linear-gradient(135deg,rgba(36,59,138,0.12),rgba(154,211,217,0.18),rgba(234,248,250,1))]">
				<div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-8 lg:py-20">
					<div className="max-w-3xl space-y-1">
						<h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
							Talk with Ellipsonic today.
						</h1>
						<p className="max-w-2xl text-lg text-muted-foreground">
							Talk with us and GET STARTED now!.
						</p>
					</div>
				</div>
			</section>

			<section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
				<div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
					<Card className="border-border shadow-lg shadow-slate-900/5">
						<CardContent className="p-6 sm:p-8">
							<div className="mb-8 flex items-start justify-between gap-4">
								<div>
									  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">
										Ellipsonic onboarding
									</p>
									<h2 className="mt-2 text-2xl font-bold">Request a pre-billing tenant call</h2>
									<p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
										Add the office email, choose a date, and set a time to talk with customers before billing begins.
									</p>
								</div>
								<div className="hidden rounded-2xl bg-muted p-3 text-primary sm:block">
									<ShieldCheck className="h-6 w-6" />
								</div>
							</div>

							<form onSubmit={handleSubmit} className="space-y-6">
								<div className="grid gap-6 sm:grid-cols-2">
									<div className="space-y-2 sm:col-span-2">
										<Label htmlFor="tenant-name">Tenant or company name</Label>
										<Input
											id="tenant-name"
											value={tenantName}
											onChange={(event) => setTenantName(event.target.value)}
											placeholder="Ellipsonic Health Services"
											className="mt-1"
										/>
									</div>

									<div className="space-y-2 sm:col-span-2">
										  <Label htmlFor="office-email" className="flex items-center gap-2">
										  <Mail className="h-4 w-4 text-primary" />
											Office email
										</Label>
										<Input
											id="office-email"
											type="email"
											value={officeEmail}
											onChange={(event) => setOfficeEmail(event.target.value)}
											placeholder="billing@company.com"
											required
											className="mt-1"
										/>
									</div>
								</div>

								<div className="grid gap-6 lg:grid-cols-[1fr_240px]">
									<div className="space-y-3 rounded-2xl border border-border bg-white p-4 shadow-sm">
										<div className="flex items-center gap-2">
											  <CalendarDays className="h-4 w-4 text-primary" />
											<Label className="text-sm font-semibold">Select a date</Label>
										</div>
										<Calendar
											mode="single"
											selected={contactDate}
											onSelect={setContactDate}
											className="w-full rounded-xl"
										/>
									</div>

									  <div className="space-y-4 rounded-2xl border border-border bg-(--muted)/60 p-4 shadow-sm">
										<div className="space-y-2">
											<Label htmlFor="contact-time" className="flex items-center gap-2">
												<Clock3 className="h-4 w-4 text-primary" />
												Time
											</Label>
											<Input
												id="contact-time"
												type="time"
												value={contactTime}
												onChange={(event) => setContactTime(event.target.value)}
												required
												className="mt-1"
											/>
										</div>

										<div className="rounded-xl bg-white p-4 shadow-sm">
											<p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
												Scheduled talk
											</p>
											<p className="mt-2 text-sm font-medium text-foreground">{formattedDate}</p>
											<p className="mt-1 text-sm text-muted-foreground">{contactTime}</p>
										</div>
									</div>
								</div>

								{submitted && (
									  <div className="rounded-2xl border border-[rgba(36,59,138,0.14)] bg-[rgba(154,211,217,0.18)] p-4 text-sm text-foreground">
										Your request is ready to be sent to Ellipsonic for pre-billing review.
									</div>
								)}

								<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
									<p className="text-sm text-muted-foreground">
										The office email will be used to coordinate the customer call before billing.
									</p>
									<Button type="submit" size="lg" className="gap-2">
										Talk with Ellipsonic
										<ArrowRight className="h-4 w-4" />
									</Button>
								</div>
							</form>
						</CardContent>
					</Card>

					<div className="space-y-6">
						<Card className="border-border bg-[linear-gradient(180deg,rgba(36,59,138,0.96),rgba(11,37,70,0.96))] text-white shadow-lg">
							<CardContent className="p-6 sm:p-8 space-y-4">
								<div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]">
									<Sparkles className="h-3.5 w-3.5" />
									Before billing
								</div>
								<h3 className="text-2xl font-bold">Confirm tenant readiness</h3>
								<p className="text-sm leading-6 text-white/80">
									Use the call to verify contacts, align billing expectations, and catch tenant-specific changes before the account goes live.
								</p>
							</CardContent>
						</Card>

						<Card className="border-border shadow-md">
							<CardContent className="p-6 space-y-4">
								<h3 className="text-lg font-semibold">What this form captures</h3>
								<ul className="space-y-3 text-sm text-muted-foreground">
									<li>Office email for billing coordination</li>
									<li>Date and time to talk with customers</li>
									<li>Tenant name for onboarding context</li>
								</ul>
							</CardContent>
						</Card>
					</div>
				</div>
			</section>
		</main>
	)
}
