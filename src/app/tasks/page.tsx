import TaskBoard from '@/components/dashboard/TaskBoard';

export default function TasksPage() {
  return (
    <div className="max-w-6xl mx-auto px-6 pt-24 pb-12">
      <h1 className="text-2xl tracking-tight mb-6">Tasks</h1>
      <TaskBoard />
    </div>
  );
}
