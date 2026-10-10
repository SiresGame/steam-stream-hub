import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const draftTicketReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { ticketId: string; hint?: string }) => ({
    ticketId: String(d?.ticketId ?? "").slice(0, 64),
    hint: String(d?.hint ?? "").slice(0, 500),
  }))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const { data: isAdmin } = await sb.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Нет доступа");
    const { data: t } = await sb.from("support_tickets").select("*").eq("id", data.ticketId).maybeSingle();
    if (!t) throw new Error("Тикет не найден");
    const [{ data: msgs }, { data: prof }, { data: sessions }] = await Promise.all([
      sb.from("support_messages").select("user_id, message, created_at").eq("ticket_id", t.id).order("created_at").limit(50),
      sb.from("profiles").select("email, balance").eq("id", t.user_id).maybeSingle(),
      sb.from("rental_sessions").select("computer_name, started_at, ended_at, total_charged").eq("user_id", t.user_id).order("started_at", { ascending: false }).limit(5),
    ]);
    const thread = [`Игрок: ${t.description}`, ...(msgs ?? []).map((m) => `${m.user_id === t.user_id ? "Игрок" : "Поддержка"}: ${m.message}`)].join("\n");

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI не настроен");
    const { createOpenAI } = await import("@ai-sdk/openai");
    const { streamText } = await import("ai");
    const provider = createOpenAI({ baseURL: "https://ai.gateway.lovable.dev/v1", apiKey, headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" } });
    const result = streamText({
      model: provider.responses("openai/gpt-6-astra"),
      maxRetries: 0,
      system: "Ты сотрудник поддержки сервиса облачной аренды игровых ПК. Подготовь вежливый, персонализированный ответ игроку по-русски на последнее сообщение, учитывая всю переписку и данные игрока. Не обещай возвратов или компенсаций, если администратор об этом не просил. Кратко, 2–6 предложений, без подписи-заглушек. Верни только текст ответа.",
      prompt: `Тема: ${t.subject}\nСтатус: ${t.status}\nИгрок: ${prof?.email ?? ""}, баланс ${prof?.balance ?? 0} ₽\nПоследние аренды: ${JSON.stringify(sessions ?? [])}\n\nПереписка:\n${thread}\n\n${data.hint ? `Указание администратора: ${data.hint}` : ""}`,
      providerOptions: { openai: { forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", store: false, include: ["reasoning.encrypted_content"] } },
    });
    try { return { text: (await result.text).trim() }; } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 429) throw new Error("Слишком много запросов, попробуйте позже");
      if (status === 402) throw new Error("Закончились AI-кредиты сервиса");
      if (status === 403) throw new Error("AI недоступен для этого аккаунта");
      throw new Error("Не удалось подготовить ответ");
    }
  });
