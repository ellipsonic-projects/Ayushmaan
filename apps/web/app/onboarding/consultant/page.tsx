"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth/context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, AlertCircle } from "lucide-react";

export default function ConsultantOnboarding() {
  const { user } = useAuth();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);

  if (!user || user.userType !== "consultant") {
    router.push("/auth/login");
    return null;
  }

  const steps = [
    {
      title: "Professional Information",
      description: "Add your credentials and expertise",
      completed: false,
    },
    {
      title: "Availability",
      description: "Set your working hours and availability",
      completed: false,
    },
    {
      title: "Pricing",
      description: "Define your consultation rates",
      completed: false,
    },
    {
      title: "Documents",
      description: "Upload licenses and certifications",
      completed: false,
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    } else {
      router.push("/dashboard/consultant");
    }
  };

  const handleSkip = () => {
    setCurrentStep(currentStep + 1);
    if (currentStep === steps.length) {
      router.push("/dashboard/consultant");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Complete Your Consultant Profile
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Step {currentStep} of {steps.length}
          </p>
        </div>
      </div>

      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-4">
          {/* Sidebar */}
          <div className="space-y-2">
            {steps.map((step, index) => (
              <div
                key={index}
                onClick={() => index < currentStep && setCurrentStep(index + 1)}
                className={`cursor-pointer rounded-lg p-4 transition-colors ${
                  currentStep === index + 1
                    ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                    : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                }`}
              >
                <div className="flex items-start gap-3">
                  {index + 1 < currentStep ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  ) : (
                    <div
                      className={`h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        currentStep === index + 1
                          ? "bg-blue-600 text-white"
                          : "bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      {index + 1}
                    </div>
                  )}
                  <div>
                    <p
                      className={`font-medium ${
                        currentStep === index + 1
                          ? "text-blue-600"
                          : "text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {step.title}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {step.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Card className="border-slate-200 dark:border-slate-800">
              <CardHeader>
                <CardTitle>{steps[currentStep - 1].title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {currentStep === 1 && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Professional Title
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., Licensed Therapist, Business Consultant"
                        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Years of Experience
                      </label>
                      <input
                        type="number"
                        placeholder="Number of years"
                        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Bio / Description
                      </label>
                      <textarea
                        placeholder="Tell clients about your expertise and approach"
                        rows={4}
                        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500"
                      />
                    </div>
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="space-y-4">
                    <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-4 border border-blue-200 dark:border-blue-800 flex gap-3">
                      <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-blue-900 dark:text-blue-100">
                          Add Your Availability
                        </p>
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                          Specify the days and hours you&apos;re available for consultations
                        </p>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">
                        Weekly Hours
                      </label>
                      <div className="space-y-3">
                        {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map(
                          (day) => (
                            <div key={day} className="flex items-center gap-4">
                              <span className="w-24 text-sm font-medium text-slate-600 dark:text-slate-400">
                                {day}
                              </span>
                              <input
                                type="time"
                                className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                              />
                              <span className="text-slate-600 dark:text-slate-400">to</span>
                              <input
                                type="time"
                                className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                              />
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === 3 && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Hourly Rate (USD)
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-600 dark:text-slate-400">$</span>
                        <input
                          type="number"
                          placeholder="150"
                          className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500"
                        />
                        <span className="text-slate-600 dark:text-slate-400">/hour</span>
                      </div>
                    </div>
                    <div className="rounded-lg bg-slate-50 dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800">
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Note: You can offer package deals and discounts after setup is complete.
                      </p>
                    </div>
                  </div>
                )}

                {currentStep === 4 && (
                  <div className="space-y-4">
                    <div className="rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 p-8 text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <div className="text-slate-600 dark:text-slate-400 mb-2">
                        📄 Upload Documents
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Click to upload your licenses, certifications, and credentials
                      </p>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-500">
                      Accepted formats: PDF, JPG, PNG (Max 5MB each)
                    </p>
                  </div>
                )}

                {/* Buttons */}
                <div className="flex gap-4 mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
                  <Button
                    onClick={handleSkip}
                    variant="outline"
                  >
                    Skip for Now
                  </Button>
                  <Button
                    onClick={handleNext}
                    className="ml-auto bg-blue-600 hover:bg-blue-700"
                  >
                    {currentStep === steps.length ? "Complete Setup" : "Next"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
