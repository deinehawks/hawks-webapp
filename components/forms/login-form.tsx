"use client";

import { useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { cn } from "@/lib/utils";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "../ui/checkbox";
import Link from "next/link";

import { login } from "@/lib/actions/auth";

const formSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [passwordInputType, setPasswordInputType] = useState("password");
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    form.clearErrors("root");
    setIsLoading(true);

    try {
      const result = await login(values);

      // If we reach here, login failed (redirect throws)
      if (result?.error) {
        form.setError("root", {
          message: result.error,
        });
      }
    } catch (error) {
      // Server action redirects throw NEXT_REDIRECT
      // This is expected behavior, don't catch it
      throw error;
    } finally {
      setIsLoading(false);
    }
  }

  function togglePasswordInputVisibility() {
    setPasswordInputType((prev) => (prev === "password" ? "text" : "password"));
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Welcome back</CardTitle>
          <CardDescription>Sign in to your account to continue</CardDescription>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} aria-busy={isLoading}>
              <div className="grid gap-6">
                {/* Email */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="you@example.com"
                          autoComplete="email"
                          disabled={isLoading}
                          className="h-11 sm:h-9"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Password */}
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type={passwordInputType}
                          autoComplete="current-password"
                          disabled={isLoading}
                          className="h-11 sm:h-9"
                          {...field}
                        />
                      </FormControl>
                      <div className="flex min-h-11 items-center gap-2 sm:min-h-8">
                        <Checkbox
                          id="show-password"
                          disabled={isLoading}
                          onCheckedChange={togglePasswordInputVisibility}
                        />
                        <label
                          htmlFor="show-password"
                          className="flex min-h-11 items-center text-sm peer-disabled:cursor-not-allowed peer-disabled:opacity-70 sm:min-h-8"
                        >
                          Show password
                        </label>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Root error message */}
                {form.formState.errors.root && (
                  <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                    {form.formState.errors.root.message}
                  </div>
                )}

                {/* Submit button */}
                <Button type="submit" className="h-11 w-full sm:h-9" disabled={isLoading}>
                  {isLoading ? "Signing in…" : "Sign in"}
                </Button>

                {/* Link to signup */}
                <div className="text-center text-sm">
                  Don&apos;t have an account?{" "}
                  <Link
                    href="/auth/signup"
                    className="underline underline-offset-4"
                  >
                    Sign up
                  </Link>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

    </div>
  );
}
