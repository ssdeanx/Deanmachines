"use client";
 
import { useState } from "react";
import { getRepoInfo } from "./action";
 
export function Form() {
  const [result, setResult] = useState<string | null>(null);
 
  async function handleSubmit(formData: FormData) {
    const res = await getRepoInfo(formData);
    setResult(res);
  }
 
  return (
    <>
      <form action={handleSubmit}>
        <input name="repo" placeholder="https://github.com/username/repo" required />
        <button type="submit">Get Github Repo Info</button>
      </form>
      {result && <pre>{result}</pre>}
    </>
  );
}