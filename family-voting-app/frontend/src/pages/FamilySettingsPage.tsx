import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PageShell from "../components/layout/PageShell";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Avatar from "../components/ui/Avatar";
import Modal from "../components/ui/Modal";
import { useAuth } from "../hooks/useAuth";
import { getFamily, updateFamily, removeFamilyMember } from "../api/families";

export default function FamilySettingsPage() {
  const { user, familyId, setFamilyId } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: family, isLoading } = useQuery({
    queryKey: ["family", familyId],
    queryFn: () => getFamily(familyId!),
    enabled: !!familyId,
  });

  const [editingName, setEditingName] = useState(false);
  const [familyName, setFamilyName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [removingUserId, setRemovingUserId] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const startEditName = () => {
    setFamilyName(family?.name ?? "");
    setEditingName(true);
  };

  const saveName = async () => {
    if (!familyId || !familyName.trim()) return;
    setSavingName(true);
    try {
      await updateFamily(familyId, familyName.trim());
      queryClient.invalidateQueries({ queryKey: ["family", familyId] });
      setEditingName(false);
    } catch {
      // Error handling
    } finally {
      setSavingName(false);
    }
  };

  const handleCopyInvite = async () => {
    if (family?.invite_code) {
      await navigator.clipboard.writeText(family.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRemoveMember = async (userId: number) => {
    if (!familyId) return;
    setActionLoading(true);
    try {
      await removeFamilyMember(familyId, userId);
      queryClient.invalidateQueries({ queryKey: ["family", familyId] });
      setRemovingUserId(null);
    } catch {
      // Error handling
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeaveFamily = async () => {
    if (!familyId || !user) return;
    setActionLoading(true);
    try {
      await removeFamilyMember(familyId, user.id);
      setFamilyId(null);
      navigate("/");
    } catch {
      // Error handling
    } finally {
      setActionLoading(false);
    }
  };

  const currentMember = family?.members?.find((m) => m.user_id === user?.id);
  const isAdmin = currentMember?.role === "admin";

  if (!familyId) {
    navigate("/");
    return null;
  }

  if (isLoading) {
    return (
      <PageShell>
        <div className="max-w-2xl mx-auto animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6" />
          <div className="bg-white rounded-xl p-6 space-y-4">
            <div className="h-6 bg-gray-100 rounded w-1/2" />
            <div className="h-6 bg-gray-100 rounded w-1/3" />
          </div>
        </div>
      </PageShell>
    );
  }

  if (!family) {
    return (
      <PageShell>
        <Card className="text-center max-w-md mx-auto py-12">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Family not found
          </h2>
          <Button onClick={() => navigate("/")}>Go to Dashboard</Button>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Family Settings
        </h1>

        <Card className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              Family Name
            </h2>
            {isAdmin && !editingName && (
              <button
                onClick={startEditName}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Edit
              </button>
            )}
          </div>

          {editingName ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                autoFocus
              />
              <Button size="sm" loading={savingName} onClick={saveName}>
                Save
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setEditingName(false)}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <p className="text-lg font-medium text-gray-900">{family.name}</p>
          )}
        </Card>

        <Card className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Invite Code
          </h2>
          <div className="flex items-center gap-3">
            <code className="bg-gray-100 px-4 py-2 rounded-lg text-lg font-mono tracking-wider">
              {family.invite_code}
            </code>
            <Button size="sm" variant="secondary" onClick={handleCopyInvite}>
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Share this code with family members so they can join.
          </p>
        </Card>

        <Card className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Members ({family.members?.length ?? 0})
          </h2>
          <div className="divide-y divide-gray-50">
            {family.members?.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
              >
                <div className="flex items-center gap-3">
                  <Avatar
                    src={member.avatar_url}
                    name={member.display_name}
                    size="md"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {member.display_name}
                      {member.user_id === user?.id && (
                        <span className="ml-1 text-xs text-gray-400">
                          (you)
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">
                      {member.role}
                    </p>
                  </div>
                </div>
                {isAdmin && member.user_id !== user?.id && (
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => setRemovingUserId(member.user_id)}
                  >
                    Remove
                  </Button>
                )}
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-red-500 uppercase tracking-wider mb-3">
            Danger Zone
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Leave this family group. You will lose access to all polls and votes.
          </p>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setShowLeaveModal(true)}
          >
            Leave Family
          </Button>
        </Card>

        <Modal
          open={showLeaveModal}
          onClose={() => setShowLeaveModal(false)}
          title="Leave Family"
        >
          <p className="text-sm text-gray-600 mb-6">
            Are you sure you want to leave {family.name}? You'll lose access to
            all polls and votes in this family.
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowLeaveModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={actionLoading}
              onClick={handleLeaveFamily}
            >
              Leave Family
            </Button>
          </div>
        </Modal>

        <Modal
          open={removingUserId !== null}
          onClose={() => setRemovingUserId(null)}
          title="Remove Member"
        >
          <p className="text-sm text-gray-600 mb-6">
            Are you sure you want to remove this member from the family?
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setRemovingUserId(null)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={actionLoading}
              onClick={() =>
                removingUserId && handleRemoveMember(removingUserId)
              }
            >
              Remove
            </Button>
          </div>
        </Modal>
      </div>
    </PageShell>
  );
}
