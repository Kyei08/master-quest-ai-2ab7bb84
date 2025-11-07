import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Shield,
  BookOpen,
  CheckCircle,
  Edit2,
  Save,
  X,
  Award,
} from "lucide-react";
import { z } from "zod";

const profileSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(1, { message: "Name cannot be empty" })
    .max(100, { message: "Name must be less than 100 characters" })
    .regex(/^[a-zA-Z\s'-]+$/, {
      message: "Name can only contain letters, spaces, hyphens, and apostrophes",
    }),
});

interface Profile {
  id: string;
  full_name: string | null;
  created_at: string;
}

interface Stats {
  totalModules: number;
  completedModules: number;
  totalQuizAttempts: number;
  totalAssignments: number;
  averageScore: number;
}

const Profile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalModules: 0,
    completedModules: 0,
    totalQuizAttempts: 0,
    totalAssignments: 0,
    averageScore: 0,
  });
  const [fullName, setFullName] = useState("");
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Load profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);
      setFullName(profileData.full_name || "");

      // Load roles
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      setRoles(rolesData?.map((r) => r.role) || ["user"]);

      // Load statistics
      await loadStats(user.id);
    } catch (error) {
      console.error("Error loading profile:", error);
      toast.error("Failed to load profile data");
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async (userId: string) => {
    try {
      // Get modules stats
      const { data: modules } = await supabase
        .from("modules")
        .select("id, status")
        .eq("user_id", userId);

      const totalModules = modules?.length || 0;
      const completedModules =
        modules?.filter((m) => m.status === "completed").length || 0;

      // Get quiz attempts
      const { data: quizAttempts } = await supabase
        .from("quiz_attempts")
        .select("score, total_questions")
        .in(
          "module_id",
          modules?.map((m) => m.id) || []
        );

      const totalQuizAttempts = quizAttempts?.length || 0;
      const averageScore =
        quizAttempts && quizAttempts.length > 0
          ? quizAttempts.reduce(
              (acc, curr) => acc + (curr.score / curr.total_questions) * 100,
              0
            ) / quizAttempts.length
          : 0;

      // Get assignment submissions
      const { data: assignments } = await supabase
        .from("assignment_submissions")
        .select("id")
        .in(
          "module_id",
          modules?.map((m) => m.id) || []
        );

      const totalAssignments = assignments?.length || 0;

      setStats({
        totalModules,
        completedModules,
        totalQuizAttempts,
        totalAssignments,
        averageScore: Math.round(averageScore),
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const handleSave = async () => {
    try {
      setValidationError("");

      // Validate input
      const result = profileSchema.safeParse({ full_name: fullName });
      if (!result.success) {
        setValidationError(result.error.errors[0].message);
        return;
      }

      setSaving(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("profiles")
        .update({ full_name: result.data.full_name })
        .eq("id", user.id);

      if (error) throw error;

      setProfile((prev) => (prev ? { ...prev, full_name: result.data.full_name } : null));
      setEditing(false);
      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFullName(profile?.full_name || "");
    setValidationError("");
    setEditing(false);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "destructive";
      case "instructor":
        return "default";
      default:
        return "secondary";
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12 text-muted-foreground">
          Loading profile...
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <User className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">My Profile</h1>
          <p className="text-muted-foreground">
            Manage your account and view your progress
          </p>
        </div>
      </div>

      {/* Profile Information */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <User className="w-5 h-5" />
              Profile Information
            </h2>
            {!editing && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing(true)}
              >
                <Edit2 className="w-4 h-4 mr-2" />
                Edit
              </Button>
            )}
          </div>

          <Separator />

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              {editing ? (
                <div className="space-y-2">
                  <Input
                    id="name"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      setValidationError("");
                    }}
                    placeholder="Enter your full name"
                    maxLength={100}
                  />
                  {validationError && (
                    <p className="text-sm text-destructive">{validationError}</p>
                  )}
                  <div className="flex gap-2">
                    <Button onClick={handleSave} disabled={saving} size="sm">
                      <Save className="w-4 h-4 mr-2" />
                      {saving ? "Saving..." : "Save"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleCancel}
                      disabled={saving}
                      size="sm"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-lg mt-2">{profile?.full_name || "Not set"}</p>
              )}
            </div>

            <div>
              <Label>Account Created</Label>
              <p className="text-lg mt-2">
                {profile?.created_at
                  ? new Date(profile.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "Unknown"}
              </p>
            </div>

            <div>
              <Label className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Roles
              </Label>
              <div className="flex gap-2 mt-2 flex-wrap">
                {roles.map((role) => (
                  <Badge key={role} variant={getRoleBadgeVariant(role)}>
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Account Statistics */}
      <Card className="p-6">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Award className="w-5 h-5" />
            Account Statistics
          </h2>

          <Separator />

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <BookOpen className="w-4 h-4" />
                <span className="text-sm">Total Modules</span>
              </div>
              <p className="text-3xl font-bold">{stats.totalModules}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">Completed Modules</span>
              </div>
              <p className="text-3xl font-bold">{stats.completedModules}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Award className="w-4 h-4" />
                <span className="text-sm">Quiz Attempts</span>
              </div>
              <p className="text-3xl font-bold">{stats.totalQuizAttempts}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <BookOpen className="w-4 h-4" />
                <span className="text-sm">Assignments Submitted</span>
              </div>
              <p className="text-3xl font-bold">{stats.totalAssignments}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Award className="w-4 h-4" />
                <span className="text-sm">Average Quiz Score</span>
              </div>
              <p className="text-3xl font-bold">
                {stats.averageScore > 0 ? `${stats.averageScore}%` : "—"}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">Completion Rate</span>
              </div>
              <p className="text-3xl font-bold">
                {stats.totalModules > 0
                  ? `${Math.round(
                      (stats.completedModules / stats.totalModules) * 100
                    )}%`
                  : "0%"}
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Profile;
