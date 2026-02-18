import { Outlet } from 'react-router'

export function AuthLayout() {
  return (
    <div className="h-full bg-bg-primary grain-texture overflow-y-auto">
      <Outlet />
    </div>
  )
}
