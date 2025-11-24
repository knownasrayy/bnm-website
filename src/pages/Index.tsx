import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Sparkles, Zap, Palette, Video, BarChart3, Megaphone } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  const divisions = [
    {
      icon: Palette,
      title: "Creative Design",
      description: "Visual branding & graphic design",
      color: "from-purple to-pink",
    },
    {
      icon: Video,
      title: "Media Production",
      description: "Video editing & motion graphics",
      color: "from-cyan to-purple",
    },
    {
      icon: BarChart3,
      title: "Marketing Strategist",
      description: "Strategy & campaign planning",
      color: "from-orange to-pink",
    },
    {
      icon: Megaphone,
      title: "Content Creator",
      description: "Social media content & copywriting",
      color: "from-pink to-purple",
    },
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-float" />
        <div className="absolute top-40 right-20 w-96 h-96 bg-pink rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-cyan rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-float" style={{ animationDelay: '2s' }} />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 border-b border-border/50 backdrop-blur-xl bg-background/50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold gradient-text">BnM ILITS 2026</h1>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => navigate("/login")}>
              Login
            </Button>
            <Button onClick={() => navigate("/request")} className="bg-gradient-to-r from-purple to-pink hover:opacity-90">
              Create Request
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 container mx-auto px-4 pt-20 pb-16">
        <div className="max-w-4xl mx-auto text-center space-y-6 animate-slide-up">
          <div className="inline-block">
            <span className="px-4 py-2 rounded-full glass text-sm font-medium">
              <Zap className="inline w-4 h-4 mr-2 text-cyan" />
              Branding & Marketing Request System
            </span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold leading-tight">
            Create Amazing
            <br />
            <span className="gradient-text">Content Together</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Submit your creative requests to BnM division. Fast, efficient, and perfectly tracked.
          </p>

          <div className="flex gap-4 justify-center pt-4">
            <Button 
              size="lg" 
              onClick={() => navigate("/request")}
              className="bg-gradient-to-r from-purple to-pink hover:opacity-90 shadow-lg hover:shadow-glow transition-all"
            >
              <Sparkles className="mr-2 w-5 h-5" />
              Start Request
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => navigate("/dashboard")}
              className="glass border-2"
            >
              View Dashboard
            </Button>
          </div>
        </div>
      </section>

      {/* Divisions Grid */}
      <section className="relative z-10 container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Our Divisions</h2>
          <p className="text-muted-foreground">Choose the perfect team for your creative needs</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {divisions.map((division, index) => (
            <Card
              key={index}
              className="glass border-border/50 p-6 hover:scale-105 transition-transform cursor-pointer group"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${division.color} flex items-center justify-center mb-4 group-hover:animate-float`}>
                <division.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{division.title}</h3>
              <p className="text-sm text-muted-foreground">{division.description}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative z-10 container mx-auto px-4 py-16">
        <div className="glass rounded-3xl p-8 md:p-12 max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold gradient-text mb-2">500+</div>
              <div className="text-muted-foreground">Requests Completed</div>
            </div>
            <div>
              <div className="text-4xl font-bold gradient-text mb-2">4</div>
              <div className="text-muted-foreground">Specialized Teams</div>
            </div>
            <div>
              <div className="text-4xl font-bold gradient-text mb-2">24/7</div>
              <div className="text-muted-foreground">Support Available</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/50 backdrop-blur-xl bg-background/50 mt-20">
        <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">
          <p>© 2026 Branding & Marketing Division - Ini Lho ITS!</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
