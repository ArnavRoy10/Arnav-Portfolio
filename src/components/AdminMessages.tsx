import { useCallback, useEffect, useState } from "react";
import { api } from "../helpers/api";
import { Button } from "./Button";
import type { Message } from "../types/site";
import styles from "./AdminMessages.module.css";

/** Contact-form messages saved by the server. Delete this block from the admin page if you don't want it. */
export const AdminMessages = () => {
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { messages } = await api<{ messages: Message[] }>("/admin/messages");
      setMessages(messages);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load messages.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleRead = async (m: Message) => {
    await api(`/admin/messages/${m.id}`, { method: "PATCH", body: { isRead: !m.isRead } });
    await load();
  };

  const remove = async (m: Message) => {
    await api(`/admin/messages/${m.id}`, { method: "DELETE" });
    await load();
  };

  const unread = (messages ?? []).filter((m) => !m.isRead).length;

  return (
    <div className={styles.wrap}>
      <h2 className={styles.heading}>
        Messages{unread > 0 ? ` (${unread} new)` : ""}
      </h2>

      {error && <p className={styles.empty}>{error}</p>}
      {messages && messages.length === 0 && (
        <p className={styles.empty}>No messages yet. They appear here when someone uses the contact form.</p>
      )}

      <ul className={styles.list}>
        {(messages ?? []).map((m) => (
          <li key={m.id} className={`${styles.item} ${m.isRead ? "" : styles.unread}`}>
            <div className={styles.top}>
              <span className={styles.from}>
                {m.name}
                <a className={styles.mail} href={`mailto:${m.email}`}>{m.email}</a>
              </span>
              <span className={styles.date}>{new Date(m.createdAt).toLocaleString()}</span>
            </div>
            <p className={styles.body}>{m.message}</p>
            <div className={styles.actions}>
              <Button size="sm" variant="outline" onClick={() => toggleRead(m)}>
                {m.isRead ? "Mark unread" : "Mark read"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => remove(m)}>Delete</Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
