import { apiFetch } from "./api";

export const ACCESS_PERMISSION_KEYS = [
  "dashboard.view", "products.view", "products.manage", "products.delete",
  "stock.view", "stock.manage", "locations.view", "locations.manage", "locations.delete",
  "categories.view", "categories.manage", "categories.delete", "sales.view", "sales.manage",
  "sales.reverse", "reports.view",
] as const;
export type AccessPermission = (typeof ACCESS_PERMISSION_KEYS)[number];
export interface AccessProfile { id: string; name: string; description: string | null; permissions: AccessPermission[]; isSystem: boolean; createdAt: string }
export interface ManagedUser { id: string; name: string; email: string; avatarUrl: string | null; role: "ADMIN" | "USER"; accessProfileId: string | null; accessProfileName: string | null; isActive: boolean; createdAt: string }

export const accessService = {
  async listProfiles() { return (await apiFetch<{ items: AccessProfile[] }>("/access-profiles")).items; },
  async createProfile(input: Pick<AccessProfile, "name" | "description" | "permissions">) {
    return (await apiFetch<{ profile: AccessProfile }>("/access-profiles", { method: "POST", body: JSON.stringify(input) })).profile;
  },
  async updateProfile(id: string, input: Partial<Pick<AccessProfile, "name" | "description" | "permissions">>) {
    return (await apiFetch<{ profile: AccessProfile }>("/access-profiles/" + id, { method: "PATCH", body: JSON.stringify(input) })).profile;
  },
  async deleteProfile(id: string) { await apiFetch<{ success: true }>("/access-profiles/" + id, { method: "DELETE" }); },
  async listUsers() { return (await apiFetch<{ items: ManagedUser[] }>("/users?page=1&pageSize=100")).items; },
  async createUser(input: { name: string; email: string; password: string; accessProfileId: string }): Promise<void> {
    await apiFetch<{ user: { id: string } }>("/users", { method: "POST", body: JSON.stringify(input) });
  },
  async updateUser(id: string, changes: { accessProfileId?: string; isActive?: boolean }) {
    return (await apiFetch<{ user: ManagedUser }>("/users/" + id, { method: "PATCH", body: JSON.stringify(changes) })).user;
  },
};
