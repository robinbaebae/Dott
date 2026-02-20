import TaskBoard from '@/components/dashboard/TaskBoard';

export default function TasksPage() {
  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">업무 관리</h1>
        <p className="text-sm text-muted-foreground mt-1">
          드래그 앤 드롭으로 업무 상태를 변경하세요
        </p>
      </div>
      <TaskBoard />
    </div>
  );
}
