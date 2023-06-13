import { useState, useEffect, KeyboardEvent } from 'react'
import { ReactSortable, GroupOptions } from 'react-sortablejs'
import { MpcProject, Sequence, SeqIndex } from '../mpc/types'

// dummy id/key for newly inserted sequences into songs
function createId(): string {
  return "id-" + Math.random().toString().substring(2)
}

type Props = {
  mpcProject: MpcProject
  count: number
  save(
    sequences: Sequence[],
    seqIndexes: SeqIndex[],
    numberMapping: Map<number, number>
  ): void
}

type ItemType = {
  id: string
  seq: Sequence
}

type SongItemType = {
  id: string
  repeat: number
  seq: {
    id: string
    Name: string
    "@number": number
  }
}

const Sequences = (props: Props) => {

  const sequences = props.mpcProject.sas.AllSeqSamps.Sequences.Sequence
  const seqIndexes = props.mpcProject.sas.AllSeqSamps.Songs.Song[0].SeqIndex

  const sequencesWithIds: ItemType[] = sequences.map(seq => {
    return { id: seq['@number'].toString(), seq }
  })

  const songsWithIds: SongItemType[] = seqIndexes.map((seqIndex, _index) => {
    const seq = sequences[seqIndex.$value]
    // Initially we start with ids matching sequence number (NOT ZERO BASED INDEX)
    return {
      id: createId(), 
      repeat: seqIndex['@repeat'],
      seq: {
        id: seq['@number'].toString(),
        Name: seq.Name,
        "@number": seq['@number']
      }
    }
  })

  const [stateSequences, setStateSequences] = useState(sequencesWithIds)
  const [stateSong, setStateSong] = useState(songsWithIds)
  const [editing, setEditing] = useState<string | null>(null)

  useEffect(() => {
    setStateSequences(sequencesWithIds)
    setStateSong(songsWithIds)
    setEditing(null)
  }, [props.count])

  const setStateSongsProxy = (sequences: any) => {
    const sequences2 = sequences.map((sequence: any) => {
      if (!sequence.id.startsWith('id-')) {
        return {
          id: createId(),
          repeat: 1,
          seq: {
            id: sequence.id,
            Name: sequence.seq.Name,
            "@number": sequence.seq['@number']
          }
        }
      }
      return sequence
    })

    setStateSong(sequences2)
  }

  const group: GroupOptions = {
    name: 'sequences',
    pull: 'clone',
    put: false
  }

  const onClick = (id: any) => () => {
    setEditing(id)
  }

  const onClickSave = () => {
    setEditing(null)
  }

  // update the name of sequence all the occurrences in songs
  const onChange = (id: any) => (e: any) => {
    setStateSequences(sequences => {
      let sequence = sequences.find(seq => seq.id == id)
      if (sequence != undefined) {
        sequence.seq.Name = e.target.value
        // Update the songs with this sequence
        setStateSong(songs => {
          for (let songSequence of songs) {
            if (songSequence.seq.id == sequence!.id) {
              songSequence.seq.Name = sequence!.seq.Name
            }
          }
          return songs
        })
      }
      return sequences
    })
  }

  const clickRepeat = (id: any, value: number) => (_e: any) => {
    let newSong = stateSong.map(seqIndex => {
      if (seqIndex.id == id) {
        seqIndex.repeat += value
        seqIndex.repeat = Math.max(seqIndex.repeat, 1)
      }
      return seqIndex
    })
    setStateSong(newSong)
  }

  const clickDelete = (id: any) => (_e: any) => {
    setStateSong(stateSong.filter(seqIndex => seqIndex.id != id))
  }

  const onKeyDown = (id: any) => (e: KeyboardEvent) => {
    if (['Enter', 'Escape'].includes(e.key)) {
      setEditing(null)
      e.preventDefault()
    } else if (e.key == 'Tab') {
      e.preventDefault()
      let sequenceIndex = stateSequences.findIndex(seq => seq.id == id)
      if (sequenceIndex == undefined) {
        return
      }

      if (e.shiftKey) {
        sequenceIndex --
        // Add length so we don't go into negative and let the modulo do the job
        sequenceIndex += stateSequences.length
      } else {
        sequenceIndex ++
      }

      sequenceIndex %= stateSequences.length

      let nextSequence = stateSequences[sequenceIndex]
      if (nextSequence == undefined) {
        return
      }

      setEditing(nextSequence.id)
    }
  }

  const sequencesElements = stateSequences.map(item => {
    if (editing == item.id) {
      return (
        <div className="sequence" key={ item.id }>
          <input autoFocus
            type="text"
            defaultValue={ item.seq.Name }
            onChange = { onChange(item.id) }
            onKeyDown = { onKeyDown(item.id) }
          />
          <div className="save-button" onClick={ onClickSave }>✓</div>
        </div>
      )
    } else {
      return (
        <div onClick={ onClick(item.id) } className="sequence" key={ item.id }>
          <div className="sequence-name">{ item.seq.Name }</div>
        </div>
      )
    }
  })

  const saveProject = () => {

    // We need to update sequences in songs and rename *.sxq files accordingly
    // so kepp the mapping old &number -> new @number
    let numberMapping: Map<number, number> = new Map()

    let sequences: Sequence[] = stateSequences
      .map((stateSequence, index) => {
        let newNumber = index + 1
        let oldNumber = stateSequence.seq['@number']
        numberMapping.set(oldNumber, newNumber)
        return {
          "@number": newNumber,
          Active: stateSequence.seq.Active,
          Name: stateSequence.seq.Name
        }
      })

    let seqIndexes: SeqIndex[] = stateSong
      .map((stateSeqIndex) => {
        // this is not a number of a sequence that starts from 1
        // this starts from 0
        let seqIndex = numberMapping.get(stateSeqIndex.seq['@number'])! - 1
        return {
          "@repeat": stateSeqIndex.repeat,
          "$value": seqIndex
        }
      })

    props.save(sequences, seqIndexes, numberMapping)
  }

  return (
    <div>
      <div className="lists">
        <ReactSortable
          className="sequences"
          list={ stateSequences }
          setList={ setStateSequences }
          group={ group }
          filter= '.editing'
        >
          { sequencesElements }
        </ReactSortable>

        <ReactSortable
          className="songs"
          list={ stateSong }
          setList={ setStateSongsProxy }
          group='sequences'
          handle=".sequence-name"
        >
          {stateSong.map((item) => (
            <div className="sequence" key={ item.id }>
              <div className="sequence-name">{ item.seq.Name }</div>
              <div className="repeat-controls">
                <span className="repeat">{ item.repeat }</span>
                <span className="sign-button" onClick={ clickRepeat(item.id, -1) }>-</span>
                <span className="sign-button" onClick={ clickRepeat(item.id, 1) }>+</span>
                <span className="delete-button" onClick={ clickDelete(item.id) }>X</span>
              </div>
            </div>
          ))}
        </ReactSortable>
      </div>
      <button onClick={ saveProject }>Save</button>
    </div>
  )
}

export default Sequences
