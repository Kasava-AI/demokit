import { redirect } from 'next/navigation'

export default function Home() {
  // In OSS mode, redirect straight to projects
  redirect('/projects')
}
