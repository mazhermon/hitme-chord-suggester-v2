import { EditorProvider } from '@/state/EditorProvider'
import { EditorScreen } from '@/components/Editor/EditorScreen'

export default function Page() {
  return (
    <EditorProvider>
      <EditorScreen />
    </EditorProvider>
  )
}
