import { Button } from "@/components/ui/button";

export default function DesignTestPage() {
  return (
    <div className="p-8 space-y-8">
      <section>
        <h1 className="text-4xl font-bold mb-4">Daygent Design System Test</h1>
        <p className="text-lg text-muted-foreground">
          Testing Inter font and the color palette from PRD
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Typography</h2>
        <div className="space-y-2">
          <p className="font-sans">
            Inter font (sans): The quick brown fox jumps over the lazy dog
          </p>
          <p className="font-mono bg-muted p-2 rounded">
            JetBrains Mono font (mono): const greeting = &quot;Hello,
            World!&quot;;
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Color Palette</h2>
        <div className="grid grid-cols-4 gap-4">
          <div className="space-y-2">
            <div className="h-20 bg-background border rounded"></div>
            <p className="text-sm">Background</p>
          </div>
          <div className="space-y-2">
            <div className="h-20 bg-primary rounded"></div>
            <p className="text-sm">Primary</p>
          </div>
          <div className="space-y-2">
            <div className="h-20 bg-secondary rounded"></div>
            <p className="text-sm">Secondary</p>
          </div>
          <div className="space-y-2">
            <div className="h-20 bg-accent rounded"></div>
            <p className="text-sm">Accent (Blue)</p>
          </div>
          <div className="space-y-2">
            <div className="h-20 bg-muted rounded"></div>
            <p className="text-sm">Muted</p>
          </div>
          <div className="space-y-2">
            <div className="h-20 bg-destructive rounded"></div>
            <p className="text-sm">Destructive</p>
          </div>
          <div className="space-y-2">
            <div className="h-20 bg-border rounded"></div>
            <p className="text-sm">Border</p>
          </div>
          <div className="space-y-2">
            <div className="h-20 bg-input rounded"></div>
            <p className="text-sm">Input</p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Button Variants</h2>
        <div className="flex flex-wrap gap-4">
          <Button>Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
          <Button variant="destructive">Destructive</Button>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Button Sizes</h2>
        <div className="flex items-center gap-4">
          <Button size="sm">Small</Button>
          <Button>Default</Button>
          <Button size="lg">Large</Button>
          <Button size="icon">🚀</Button>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Code Block Example</h2>
        <pre className="font-mono bg-muted p-4 rounded-lg overflow-x-auto">
          <code>{`// Example code using JetBrains Mono
function expandIssue(issue: Issue): ExpandedIssue {
  return {
    ...issue,
    expandedDescription: generateDescription(issue),
    implementationSteps: generateSteps(issue),
    testingStrategy: generateTests(issue)
  };
}`}</code>
        </pre>
      </section>
    </div>
  );
}
