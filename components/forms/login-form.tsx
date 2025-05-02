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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { login } from "@/lib/actions/auth";
import { Checkbox } from "../ui/checkbox";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [passwordInputType, setPasswordInputType] = useState("password");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const formSchema = z.object({
    email: z.string().email(),
    password: z.string(),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const error = await login(values);

    if (error) {
      setError(error.message);
    } else {
      setError("");
    }
  }

  function togglePasswordInputVisibility() {
    if (passwordInputType === "password") {
      setPasswordInputType("text");
    }
    if (passwordInputType === "text") {
      setPasswordInputType("password");
    }
    return null;
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Welcome back</CardTitle>
          <CardDescription>
            {/* Login with your Apple or Google account */}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="grid gap-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          id="email"
                          type="email"
                          placeholder="you@example.com"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription></FormDescription>
                      <FormMessage>
                        {form.formState.errors.email?.message}
                      </FormMessage>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center">
                        <FormLabel>Password</FormLabel>
                        <a
                          href="#"
                          className="ml-auto text-sm underline-offset-4 hover:underline"
                        >
                          Forgot your password?
                        </a>
                      </div>
                      <FormControl>
                        <div className="flex flex-col gap-2">
                          <Input
                            id="password"
                            type={passwordInputType}
                            {...field}
                          />
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id="show-password"
                              onCheckedChange={() =>
                                togglePasswordInputVisibility()
                              }
                            />
                            <label
                              htmlFor="show-password"
                              className="text-sm leading none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              Show Password
                            </label>
                          </div>
                        </div>
                      </FormControl>
                      <FormDescription></FormDescription>
                      <FormMessage>
                        {form.formState.errors.password?.message}
                      </FormMessage>
                    </FormItem>
                  )}
                />
                {error && (
                  <FormItem>
                    <FormMessage> Error: {error} </FormMessage>
                  </FormItem>
                )}
                <Button
                  onClick={() => setError("")}
                  type="submit"
                  className="w-full"
                >
                  {form.formState.isSubmitting ? "Logging in..." : "Login"}
                </Button>
                <div className="text-center text-sm">
                  Don&apos;t have an account?{" "}
                  <a
                    href="/auth/signup"
                    className="underline underline-offset-4"
                  >
                    Sign up
                  </a>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      <div className="text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-4">
        By continuing, you agree to our <a href="#">Terms of Service</a> and{" "}
        <a href="#">Privacy Policy</a>.
      </div>
    </div>
  );
}
