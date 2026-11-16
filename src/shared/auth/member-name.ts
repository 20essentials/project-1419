import type { Tokens } from "@wix/sdk";
import { getMemberClient } from "@/shared/wix/member-client";

export const getMemberName = async (tokens: Tokens): Promise<string> => {
  const { member } = await getMemberClient(tokens).members.getCurrentMember({
    fieldsets: ["FULL"],
  });
  return member?.contact?.firstName || member?.profile?.nickname || "";
};
