/**
 * UNILOK 模板装饰组件：L 形角标（左上橙红 → 右下深蓝）
 * 用法：放在 relative 容器内，作为装饰叠加层。
 */
export default function CornerAccent({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 ${className}`} aria-hidden="true">
      <span className="absolute start-0 top-0 h-6 w-6 border-s-2 border-t-2 border-accent md:h-8 md:w-8" />
      <span className="absolute bottom-0 end-0 h-6 w-6 border-b-2 border-e-2 border-primary md:h-8 md:w-8" />
    </div>
  );
}
