"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronRight, Code, GitBranch, Zap } from "lucide-react";

const slides = [
  {
    title: "Welcome to Daygent",
    description: "Daygent is an app to manage Software Engineering Agents in your product development process",
    icon: Code,
  },
  {
    title: "AI-Powered Development",
    description: "Create issues that are optimized for Claude Code and other AI assistants to implement",
    icon: Zap,
  },
  {
    title: "GitHub Integration",
    description: "Seamlessly sync issues between Daygent and GitHub for complete visibility",
    icon: GitBranch,
  },
];

export default function WelcomePage() {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      router.push("/settings/repositories");
    }
  };

  const slide = slides[currentSlide];
  const Icon = slide.icon;

  return (
    <div className="space-y-8">
      <Card className="p-12 text-center space-y-6">
        <div className="flex justify-center">
          <div className="h-20 w-20 bg-blue-100 rounded-full flex items-center justify-center">
            <Icon className="h-10 w-10 text-blue-600" />
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-bold">{slide.title}</h1>
          <p className="text-gray-600 max-w-md mx-auto">
            {slide.description}
          </p>
        </div>

        <div className="flex items-center justify-center space-x-2">
          {slides.map((_, index) => (
            <div
              key={index}
              className={`h-2 w-2 rounded-full transition-colors ${
                index === currentSlide ? "bg-blue-600" : "bg-gray-300"
              }`}
            />
          ))}
        </div>
      </Card>

      <Button 
        onClick={handleNext} 
        className="w-full"
        size="lg"
      >
        {currentSlide < slides.length - 1 ? (
          <>
            Next
            <ChevronRight className="ml-2 h-4 w-4" />
          </>
        ) : (
          "Connect with GitHub"
        )}
      </Button>
    </div>
  );
}