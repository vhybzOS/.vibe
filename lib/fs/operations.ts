/**
 * File System Operations - Production Ready
 * 
 * Clean, self-contained file system utilities for v2
 */

export async function fileExists(path: string): Promise<boolean> {
  try {
    const stat = await Deno.stat(path)
    return stat.isFile
  } catch {
    return false
  }
}

export async function dirExists(path: string): Promise<boolean> {
  try {
    const stat = await Deno.stat(path)
    return stat.isDirectory
  } catch {
    return false
  }
}

export async function ensureDir(path: string): Promise<void> {
  await Deno.mkdir(path, { recursive: true })
}

export async function readTextFile(path: string): Promise<string> {
  return await Deno.readTextFile(path)
}

export async function writeTextFile(path: string, content: string): Promise<void> {
  await Deno.writeTextFile(path, content)
}

export async function loadJson<T = any>(path: string): Promise<T> {
  const content = await readTextFile(path)
  return JSON.parse(content)
}

export async function saveJson(path: string, data: any): Promise<void> {
  const content = JSON.stringify(data, null, 2)
  await writeTextFile(path, content)
}

export async function copyFile(src: string, dest: string): Promise<void> {
  await Deno.copyFile(src, dest)
}

export async function removeFile(path: string): Promise<void> {
  await Deno.remove(path, { recursive: true })
}

export async function listDir(path: string): Promise<string[]> {
  const items = []
  for await (const entry of Deno.readDir(path)) {
    items.push(entry.name)
  }
  return items
}