'use client'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { History, Home, Package, Settings } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/', label: 'Dashboard', Icon: Home },
  { href: '/inventory', label: 'Inventory', Icon: Package },
  { href: '/scan-log', label: 'Scan Log', Icon: History },
  { href: '/settings', label: 'Settings', Icon: Settings },
]

export function AppSidebar() {
  const pathname = usePathname()
  return (
    <Sidebar>
      <SidebarHeader>
        <div className="px-2 py-1 font-bold text-sm">Agent Harness</div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map(({ href, label, Icon }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton
                    isActive={pathname === href}
                    render={
                      <Link href={href}>
                        <Icon className="size-4" />
                        <span>{label}</span>
                      </Link>
                    }
                  />
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
