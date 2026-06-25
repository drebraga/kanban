"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ClipboardList, Loader2, Lock, LogOut, UserPlus } from "lucide-react";
import { login, getMe, register } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import type { User } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const TOKEN_KEY = "taskflow:token";

type AuthMode = "login" | "register";

type AuthForm = {
  name: string;
  email: string;
  password: string;
  passwordConfirmation: string;
};

const initialForm: AuthForm = {
  name: "",
  email: "",
  password: "",
  passwordConfirmation: "",
};

export function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [form, setForm] = useState<AuthForm>(initialForm);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isBooting, setIsBooting] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const title = useMemo(
    () => (mode === "login" ? "Acessar TaskFlow" : "Criar conta"),
    [mode]
  );

  useEffect(() => {
    async function restoreSession() {
      const savedToken = window.localStorage.getItem(TOKEN_KEY);

      if (!savedToken) {
        setIsBooting(false);
        return;
      }

      setToken(savedToken);

      try {
        const currentUser = await getMe(savedToken);
        setUser(currentUser);
      } catch {
        window.localStorage.removeItem(TOKEN_KEY);
        setToken(null);
      } finally {
        setIsBooting(false);
      }
    }

    void restoreSession();
  }, []);

  function updateField(field: keyof AuthForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      if (mode === "register") {
        if (form.password !== form.passwordConfirmation) {
          setError("As senhas não conferem.");
          return;
        }

        await register({
          name: form.name,
          email: form.email,
          password: form.password,
        });
        setForm(initialForm);
        setMode("login");
        setSuccessMessage(
          "Cadastro efetuado com sucesso. Entre com seu e-mail e senha."
        );
        return;
      }

      const response = await login({
        email: form.email,
        password: form.password,
      });

      window.localStorage.setItem(TOKEN_KEY, response.accessToken);
      setToken(response.accessToken);
      setUser(response.user);
      setForm(initialForm);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível autenticar. Tente novamente."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleLogout() {
    window.localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }

  if (isBooting) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-100 text-zinc-950">
        <Loader2 className="size-6 animate-spin text-zinc-500" />
      </main>
    );
  }

  if (token && user) {
    return (
      <main className="min-h-screen bg-zinc-100 text-zinc-950">
        <header className="border-b border-zinc-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-zinc-950 text-white">
                <ClipboardList className="size-5" />
              </div>
              <div>
                <p className="text-sm font-semibold leading-none">TaskFlow</p>
                <p className="mt-1 text-xs text-zinc-500">{user.email}</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut />
              Sair
            </Button>
          </div>
        </header>

        <section className="mx-auto grid max-w-6xl gap-4 px-5 py-6 md:grid-cols-[1fr_280px]">
          <div className="rounded-lg border border-zinc-200 bg-white p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold tracking-normal">
                  Quadro Kanban
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
                  Autenticação conectada. O próximo ciclo adiciona as colunas,
                  cards e movimentação por arrastar.
                </p>
              </div>
              <Badge variant="secondary">Sessão ativa</Badge>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-4">
              {["A Fazer", "Em Andamento", "Em Revisão", "Concluído"].map(
                (column) => (
                  <div
                    key={column}
                    className="min-h-40 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-3"
                  >
                    <p className="text-sm font-medium">{column}</p>
                  </div>
                )
              )}
            </div>
          </div>

          <aside className="rounded-lg border border-zinc-200 bg-white p-5">
            <p className="text-sm font-medium">Usuário</p>
            <p className="mt-3 text-lg font-semibold">{user.name}</p>
            <p className="mt-1 break-all text-sm text-zinc-500">{user.email}</p>
          </aside>
        </section>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen bg-zinc-100 text-zinc-950 lg:grid-cols-[1fr_440px]">
      <section className="flex min-h-[320px] flex-col justify-between bg-zinc-950 p-6 text-white lg:min-h-screen lg:p-10">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-white text-zinc-950">
            <ClipboardList className="size-5" />
          </div>
          <p className="text-sm font-semibold">TaskFlow</p>
        </div>

        <div className="max-w-xl">
          <Badge className="bg-emerald-400 text-emerald-950 hover:bg-emerald-400">
            Kanban operacional
          </Badge>
          <h1 className="mt-5 text-4xl font-semibold tracking-normal md:text-5xl">
            Organize tarefas com fluxo, prioridade e responsáveis.
          </h1>
          <p className="mt-5 text-base leading-7 text-zinc-300">
            Entre para acessar o quadro, gerenciar cards e acompanhar as
            movimentações do time.
          </p>
        </div>
      </section>

      <section className="flex items-center justify-center px-5 py-8">
        <Card className="w-full max-w-md rounded-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              {mode === "login" ? <Lock /> : <UserPlus />}
              {title}
            </CardTitle>
            <CardDescription>
              {mode === "login"
                ? "Use seu e-mail e senha para continuar."
                : "Crie seu usuário e depois entre pela tela de login."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4" onSubmit={handleSubmit}>
              {mode === "register" ? (
                <label className="grid gap-2 text-sm font-medium">
                  Nome
                  <Input
                    value={form.name}
                    onChange={(event) => updateField("name", event.target.value)}
                    minLength={2}
                    required
                  />
                </label>
              ) : null}

              <label className="grid gap-2 text-sm font-medium">
                E-mail
                <Input
                  type="email"
                  value={form.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  required
                />
              </label>

              <label className="grid gap-2 text-sm font-medium">
                Senha
                <Input
                  type="password"
                  value={form.password}
                  onChange={(event) =>
                    updateField("password", event.target.value)
                  }
                  minLength={mode === "register" ? 6 : undefined}
                  required
                />
              </label>

              {mode === "register" ? (
                <label className="grid gap-2 text-sm font-medium">
                  Confirmar senha
                  <Input
                    type="password"
                    value={form.passwordConfirmation}
                    onChange={(event) =>
                      updateField("passwordConfirmation", event.target.value)
                    }
                    minLength={6}
                    required
                  />
                </label>
              ) : null}

              {error ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              ) : null}

              {successMessage ? (
                <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  {successMessage}
                </p>
              ) : null}

              <Button className="h-10" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="animate-spin" /> : null}
                {mode === "login" ? "Entrar" : "Criar conta"}
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setError(null);
                  setSuccessMessage(null);
                  setMode(mode === "login" ? "register" : "login");
                }}
              >
                {mode === "login" ? "Criar uma conta" : "Já tenho conta"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
