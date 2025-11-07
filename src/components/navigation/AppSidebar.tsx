import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Home, BookOpen, GraduationCap, LogOut, Sparkles, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const [isInstructor, setIsInstructor] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [modules, setModules] = useState<Array<{ id: string; topic: string }>>([]);
  const collapsed = state === "collapsed";

  useEffect(() => {
    checkInstructorRole();
    loadModules();
  }, []);

  const checkInstructorRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    setIsInstructor(roles?.some(r => r.role === "instructor" || r.role === "admin") || false);
    setIsAdmin(roles?.some(r => r.role === "admin") || false);
  };

  const loadModules = async () => {
    const { data } = await supabase
      .from("modules")
      .select("id, topic")
      .order("created_at", { ascending: false })
      .limit(5);

    setModules(data || []);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/auth");
  };

  const mainItems = [
    { title: "Dashboard", url: "/dashboard", icon: Home },
    ...(isInstructor ? [{ title: "Grading", url: "/grading", icon: GraduationCap }] : []),
    ...(isAdmin ? [{ title: "Admin", url: "/admin", icon: Shield }] : []),
  ];

  const getNavCls = (isActive: boolean) =>
    isActive ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/50";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-4 py-3">
          <Sparkles className="w-6 h-6 text-primary" />
          {!collapsed && (
            <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Quantum Leap
            </span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) => getNavCls(isActive)}
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {modules.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Recent Modules</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {modules.map((module) => (
                  <SidebarMenuItem key={module.id}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={`/module/${module.id}`}
                        className={({ isActive }) => getNavCls(isActive)}
                      >
                        <BookOpen className="h-4 w-4" />
                        {!collapsed && (
                          <span className="truncate">{module.topic}</span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>Sign Out</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
