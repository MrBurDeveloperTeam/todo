from pathlib import Path
p=Path('src/features/whiteboard/hooks/useWhiteboardData.ts')
text=p.read_text()
text=text.replace("// Polling for shared boards — refetch notes & drawings every 3s\n  // This is the reliable sync path for unauthenticated phone users\n  useEffect(() => {\n    if (!whiteboardId || !whiteboardReady || isOffline) return;\n    if (!userId || !isValidUUID(effectiveWhiteboardId)) return;\n",
"// Polling fallback — refetch notes & drawings every 3s\n  // Ensures sync even if realtime misses (e.g., RLS or network gaps)\n  useEffect(() => {\n    if (!whiteboardReady || isOffline) return;\n    if (!userId || !isValidUUID(effectiveWhiteboardId)) return;\n")
p.write_text(text)
