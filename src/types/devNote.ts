/** A single in-app testing note, tied to the page it was written on. */
export interface DevNote {
  id: string;
  author_id: string | null;
  author_name: string | null;
  page_path: string;
  page_title: string | null;
  body: string;
  author_role: string | null;
  user_agent: string | null;
  viewport: string | null;
  resolved: boolean;
  created_at: string;
}
