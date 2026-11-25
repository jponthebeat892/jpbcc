import { base44 } from '@/api/base44Client';

export async function acceptRequest(request) {
  const response = await base44.functions.invoke('acceptConnection', { request_id: request.id });
  const data = response.data || {};
  if (data.error) throw new Error(data.error);
  return data;
}

export async function rejectRequest(request) {
  return base44.entities.Connection.update(request.id, {
    status: 'declined',
    responded_date: new Date().toISOString(),
  });
}

export async function cancelRequest(request) {
  return base44.entities.Connection.update(request.id, {
    status: 'cancelled',
    responded_date: new Date().toISOString(),
  });
}

export function counterpartOf(conversation, userId) {
  if (!conversation?.participants) return { id: '', handle: 'operator' };
  const index = conversation.participants.findIndex((participant) => participant !== userId);
  const safeIndex = index < 0 ? 0 : index;
  return {
    id: conversation.participants[safeIndex],
    handle: conversation.participant_handles?.[safeIndex] || 'operator',
  };
}