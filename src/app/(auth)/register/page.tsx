import { signup } from '../actions'

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md space-y-8 p-8 border rounded-xl bg-card shadow-sm">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">Create an account</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Register as a Customer Service Representative
          </p>
        </div>

        <form action={signup} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="fullName">Full Name</label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              required
              className="w-full p-2 border rounded-md bg-background"
              placeholder="John Doe"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="username">Username</label>
            <input
              id="username"
              name="username"
              type="text"
              required
              className="w-full p-2 border rounded-md bg-background"
              placeholder="johndoe123"
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
            Register
          </button>
        </form>

        <div className="text-center text-sm">
          Already have an account?{" "}
          <a href="/login" className="text-primary hover:underline">Login</a>
        </div>
      </div>
    </div>
  )
}
