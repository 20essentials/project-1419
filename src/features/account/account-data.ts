import type { Tokens } from '@wix/sdk';
import { getMemberClient } from '@/shared/wix/member-client';

export interface AccountProfile {
  id: string;
  firstName: string;
  lastName: string;
  nickname: string;
  email: string;
  phone: string;
  initials: string;
}

export interface AccountOrder {
  id: string;
  number: number;
  date: string;
  total: string;
  items: string[];
  status: string;
}

export type AccountOrdersResult =
  | { state: 'ready'; orders: AccountOrder[] }
  | { state: 'empty' }
  | { state: 'error' };

const MAX_ORDERS = 20;

const shortName = (value: string | null | undefined) => (value ?? '').trim().slice(0, 20);

const initialsOf = (firstName: string, lastName: string, nickname: string) => {
  const a = firstName.charAt(0);
  const b = lastName.charAt(0) || nickname.charAt(0);
  return (a + b).toUpperCase() || 'N';
};

export const getAccountProfile = async (tokens: Tokens): Promise<AccountProfile> => {
  const client = getMemberClient(tokens);
  const { member } = await client.members.getCurrentMember({ fieldsets: ['FULL'] });
  if (!member?._id) throw new Error('member sin id');
  const contact = member.contact;
  const profile = member.profile;
  const firstName = contact?.firstName ?? '';
  const lastName = contact?.lastName ?? '';
  const nickname = profile?.nickname ?? '';
  return {
    id: member._id,
    firstName,
    lastName,
    nickname,
    email: member.loginEmail ?? '',
    phone: contact?.phones?.[0] ?? '',
    initials: initialsOf(firstName, lastName, nickname),
  };
};

export const getAccountOrders = async (tokens: Tokens, memberId: string): Promise<AccountOrdersResult> => {
  const client = getMemberClient(tokens);
  const { orders: list } = await client.orders.searchOrders({
    filter: { 'buyerInfo.memberId': { $eq: memberId } },
    cursorPaging: { limit: MAX_ORDERS },
  });
  const mapped = (list ?? []).flatMap((order) => {
    const number = typeof order.number === 'number' ? order.number : null;
    if (!number) return [];
    const items = (order.lineItems ?? [])
      .map((item) => {
        const name = item.productName?.original ?? '';
        const quantity = typeof item.quantity === 'number' ? item.quantity : 1;
        return name ? `${quantity > 1 ? `${quantity}× ` : ''}${name}` : '';
      })
      .filter(Boolean)
      .slice(0, 4);
    const created = order._createdDate ?? order.purchasedDate;
    return [
      {
        id: order._id ?? String(number),
        number,
        date: created instanceof Date ? created.toISOString() : String(created ?? ''),
        total: order.priceSummary?.total?.formattedAmount ?? '',
        items,
        status: order.status ?? '',
      },
    ];
  });
  if (mapped.length === 0) return { state: 'empty' };
  mapped.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  return { state: 'ready', orders: mapped.slice(0, MAX_ORDERS) };
};

export const updateAccountProfile = async (
  tokens: Tokens,
  fields: { firstName: string; lastName: string; phone: string },
): Promise<void> => {
  const client = getMemberClient(tokens);
  const { member } = await client.members.getCurrentMember({ fieldsets: ['FULL'] });
  if (!member?._id) throw new Error('member sin id');
  const phones = member.contact?.phones ?? [];
  const contact = {
    ...(fields.firstName ? { firstName: fields.firstName } : {}),
    ...(fields.lastName ? { lastName: fields.lastName } : {}),
    ...(fields.phone ? { phones: [fields.phone, ...phones.slice(1)] } : {}),
  };
  await client.members.updateMember(member._id, { contact });
  if (!fields.phone && phones.length > 0) {
    await client.members.deleteMemberPhones(member._id);
  }
};
