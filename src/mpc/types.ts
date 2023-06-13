export type Sequences = {
  Count: number
  Sequence: Array<Sequence>
}

export type Sequence = {
  "@number": number
  Active: boolean
  Name: string
}

export type SeqIndex = {
  "@repeat": number
  "$value": number
}

export type Song = {
  "@number": number
  Name: String
  TempoIgnore: boolean
  SeqIndex: Array<SeqIndex>
}

export type Songs = {
  Count: number
  Song: Array<Song>
}

export type AllSeqSamps = {
  Sequences: Sequences
  Songs: Songs
}

export type MPCVObject = {
  Version: Version
  AllSeqSamps: AllSeqSamps
}

export type Version = {
  File_Version: string
  Application: string
  Application_Version: string,
  Platform: string,
}

export type MpcProject = {
  // The root directory that containx .xpj file
  root: string,
  // The directory that contains [ProjectData]
  root_project_data: string,
  // Project file name
  file_path: string
  // The actual project
  sas: MPCVObject
}
