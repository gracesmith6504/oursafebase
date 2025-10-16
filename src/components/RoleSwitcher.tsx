import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Users, UserCog } from "lucide-react";

interface RoleSwitcherProps {
  currentRole: "committee" | "attendee";
}

const RoleSwitcher = ({ currentRole }: RoleSwitcherProps) => {
  const navigate = useNavigate();

  const switchRole = (role: "committee" | "attendee") => {
    localStorage.setItem("preferredRole", role);
    if (role === "committee") {
      navigate("/dashboard");
    } else {
      navigate("/attendee");
    }
  };

  return (
    <div className="flex items-center gap-2 rounded-lg bg-muted p-1">
      <Button
        variant={currentRole === "committee" ? "default" : "ghost"}
        size="sm"
        onClick={() => switchRole("committee")}
        className="gap-2"
      >
        <UserCog className="h-4 w-4" />
        Committee
      </Button>
      <Button
        variant={currentRole === "attendee" ? "default" : "ghost"}
        size="sm"
        onClick={() => switchRole("attendee")}
        className="gap-2"
      >
        <Users className="h-4 w-4" />
        Attendee
      </Button>
    </div>
  );
};

export default RoleSwitcher;
