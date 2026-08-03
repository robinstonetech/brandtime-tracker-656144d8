/** Shared task DTO shapes (client-safe types only). */

export type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  status: "open" | "done";
  dueOn: string | null;
  projectId: string;
  projectName: string;
  categoryId: string;
  categoryName: string;
  assigneeIds: string[];
  loggedMinutes: number;
};

export type MyTaskGroup = {
  projectId: string;
  projectName: string;
  categories: {
    categoryId: string;
    categoryName: string;
    tasks: {
      id: string;
      title: string;
      description: string | null;
      dueOn: string | null;
      projectId: string;
      categoryId: string;
      assigned: boolean;
    }[];
  }[];
};
