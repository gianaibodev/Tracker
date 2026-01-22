import { login } from '../actions'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md space-y-8 p-8 border rounded-xl bg-card shadow-sm">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">Login to Tracker</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Enter your credentials to access your dashboard
          </p>
        </div>

        <form action={login} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="username">Username</label>
            <input
              id="username"
              name="username"
              type="text"
              required
              className="w-full p-2 border rounded-md bg-background"
              placeholder="admin"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full p-2 border rounded-md bg-background"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive font-medium">{error}</p>
          )}

          <button
            type="submit"
            className="w-full py-2 px-4 bg-primary text-primary-foreground font-medium rounded-md hover:opacity-90 transition-opacity"
          >
            Sign In
          </button>
        </form>

        <div className="text-center text-sm">
          Don't have an account?{" "}
          <a href="/register" className="text-primary hover:underline">Register</a>
        </div>
      </div>
    </div>
  )
}
