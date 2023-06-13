import { useState } from 'react'
import { invoke } from '@tauri-apps/api/tauri'
import * as dialog from '@tauri-apps/api/dialog'
import { MpcProject, Sequence, SeqIndex } from './mpc/types'
import './App.css'
import Sequences from './comps/sortable'

type AppState = {
  mpcProject: MpcProject | null,
  count: number
}

function App() {

  const [state, setState] = useState<AppState>({
    mpcProject: null,
    count: 1,
  })

  async function openProject() {

		const selected = await dialog.open({
			multiple: false,
			filters: [{
				name: 'Akai MPC Project',
				extensions: ['xpj']
			}]
		})

    if (selected != null) {
      let mpcProjectJson = await invoke("parse_project", { filePath:  selected })

      // Well we should trust the backend sends correct JSON so no need to parse and validate
      let mpcProject: MpcProject = JSON.parse(mpcProjectJson as unknown as string)
      console.log(`Opened project ${mpcProject.file_path}`)
      // Incrementing variable to force refreshing state lol
      setState(state => ({ mpcProject, count: state.count + 1 }))
    }
  }

  async function saveProject(
    sequences: Sequence[],
    seqIndexes: SeqIndex[],
    numberMapping: Map<number, number>
  ) {
    if (state.mpcProject == null) {
      console.log('How did this happen')
      return
    }
    state.mpcProject.sas.AllSeqSamps.Sequences.Sequence = sequences
    state.mpcProject.sas.AllSeqSamps.Songs.Song[0].SeqIndex = seqIndexes

    const mpcProjectJson = JSON.stringify(state.mpcProject)
    const numberMappingObj = Object.fromEntries(
      [...numberMapping.entries()]
        .map(([k, v]: [number, number]) => [k.toString(), v.toString()])
    )
    const numberMappingJson = JSON.stringify(numberMappingObj)
    try {
      await invoke("save_project", {
        project: mpcProjectJson,
        numberMapping: numberMappingJson,
      })
      // We need to reopen the project because we rewrote files and indexes (seq.@number) changed
      let mpcProjectJsonReopened = await invoke("parse_project", { filePath:  state.mpcProject.file_path })

      // Well we should trust the backend sends correct JSON so no need to parse and validate
      let mpcProject: MpcProject = JSON.parse(mpcProjectJsonReopened as unknown as string)
      setState(state => ({ mpcProject, count: state.count += 1 }))

    } catch(error) {
      alert(`Error saving project.. ${error}`)
    }
  }

  const main = state.mpcProject == null
    ? <div>Please back your project up before using this tool.</div>
    : <Sequences mpcProject={ state.mpcProject } count={ state.count } save={ saveProject } />

  const path = state.mpcProject == null ? null : state.mpcProject.file_path

  return (
    <div className="container">
      <div>
        <button onClick={ openProject }>Open</button>
        <span className="project-path">{ path }</span>
      </div>
      { main }
    </div>
  )
}

export default App
