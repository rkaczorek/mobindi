import { AstrometryResult } from "./ProcessorTypes";
import { IndiMessage } from "./IndiTypes";

export type CameraDeviceSettings = {
    prefix?:string;
    type?:string;
    bin?: number;
    exposure: number;
    iso?: null|string;
    preferedFocuserDevice?: null|string;
}

export type CameraDeviceDynState = {
    focuserDevice?: null|string;
};

export type SequenceStep = {
    count: number;
    dither?: boolean;
    done?: number;
    type: string;
}

export type Sequence = {
    status: "idle"|"running"|"paused"|"done"|"error";
    progress: string | null;
    title: string;
    camera: string | null;
    errorMessage: string|null;
    count?:number;
    done?:boolean;
    steps: {
        list: string[];
        byuuid: {[uuid:string]:SequenceStep}
    };
    // uuids of images
    images: string [];
    storedImages?: ImageStatus[];
}

export type IndiMessageWithUid = IndiMessage & {
    uid: string;
};

export type IndiDeviceConfiguration = {
    driver: string;
    config?: string;
    skeleton?: string;
    prefix?: string;
    options: {[id:string]:number|string|boolean};
};

export type IndiServerConfiguration = {
    path: null;
    fifopath: null;
    devices: {[id: string]: IndiDeviceConfiguration};
    autorun: boolean;
}

export type IndiServerState = IndiServerConfiguration & {
    restartList: string[];
};

export type IndiProperty = {
    $_: string;
    $name: string;
    $label: string;
    $format: string;
}

export type IndiVector = {
    $label: string;
    $type: "Number"|"Text"|"Switch"|"BLOB"|"Light",
    $perm: string;
    $rule: string;
    $group: string;
    $state: "Busy"|"Error"|"Ok"|"Idle"|"";
    $timestamp: string;
    $message: string;
    $rev: number;
    childNames: string[];
    childs: {
        [propId: string]: IndiProperty
    };
}

export type IndiDevice = {
    [vecId: string]: IndiVector
}

export type IndiManagerStatus = {
    status: "error"|"connecting"|"connected";
    configuration: {
        indiServer: IndiServerConfiguration;
        driverPath: string;
    };
    driverToGroup: {[driver: string]: string};
    deviceTree: {[deviceId:string]:IndiDevice}
    messages: {
        byUid: {[uuid:string]:IndiMessageWithUid}
    };
}

export type IndiManagerSetPropertyRequest = {
    data: {
        dev: string;
        vec: string;
        children: {name:string, value:string}[]
    }
}

export type ImageStatus = {
    path: string;
    device: string;
}

export type CameraConfiguration = {
    defaultImagePath?: string;
    defaultImagePrefix?: string;
    fakeImages?: string[];
    fakeImagePath?: string;
    preferedDevice: string | null;
    deviceSettings : {[id: string] : CameraDeviceSettings};
};

export type CameraStatus = {
    status: string;
    selectedDevice: string | null;
    availableDevices: string [];
    currentShoots: {[deviceId:string]:any};
    lastByDevices: {[deviceId:string]:string};
    dynStateByDevices: {[deviceId: string] : CameraDeviceDynState};
    images: {
        list: string[];
        byuuid: {[uuid:string]:ImageStatus}
    };

    sequences: {
        list: string[],
        byuuid: {[uuid: string]:Sequence}
    };

    // FIXME: config
    configuration: CameraConfiguration;
}

export type FocuserSettings = {
    range: number;
    steps: number;
    backlash: number;
    lowestFirst : boolean;
    targetCurrentPos: boolean;
    targetPos: number;
}

export type AutoFocusConfiguration = {
    preferedCamera: string|null;

    // By focuser settings
    settings: {[id: string]:FocuserSettings};
};

export type AutoFocusStatus = {
    status: "idle"|"running"|"done"|"error"|"interrupted";
    camera: null|string;
    focuser: null|string;
    error: null|string;
    firstStep: null|number;
    lastStep: null|number;
    points: {[id:string]:{fwhm: number|null}};
    predicted: {[id:string]:{fwhm: number}};
    targetStep: null|number;
}

export type FocuserUpdateCurrentSettingsRequest = {
    diff: any
}

export type FocuserStatus = {
    selectedCamera: string|null;
    availableFocusers: string[];
    config: AutoFocusConfiguration;
    current: AutoFocusStatus;
}

export type AstrometrySettings = {
    initialFieldMin: number;
    initialFieldMax: number;

    // Use scope position when available
    useMountPosition: boolean;
    // When useScopePosition is true (else, 180°)
    initialSearchRadius: number|null;

    // Used after a successfull sync
    narrowedSearchRadius: number|null;
    // Used after a successfull search
    narrowedFieldPercent: number;

    polarAlign: PolarAlignSettings;
}

export type PolarAlignSettings = {
    slewRate: string;
    sampleCount: number;
    angle: number;
    minAltitude: number;
    dyn_nextFrameIsReferenceFrame?: boolean;
}

export type PolarAlignAxisResult = {
    alt: number;
    az: number;
    tooHigh: number;
    tooEast: number;
    distance: number;
}

export type PolarAlignPositionWarning = {
    id: string;
    // From 0 : do not accept to 1 ok
    dst: number;
}

export type PolarAlignStatus = {
    status: "initialConfirm"|"running"|"paused"|"adjusting"|"done";
    data: {
        [id: string]:{relRaDeg: number, dec: number}
    };

    // Valid for status running, pause, done
    fatalError: null|string;

    stepId: number;
    maxStepId: number;
    astrometrySuccess: number;
    astrometryFailed: number;
    shootDone: number;
    shootRunning: boolean;
    scopeMoving: boolean;
    astrometryRunning: boolean;

    axis?: null | PolarAlignAxisResult;
    hasRefFrame: boolean;

    adjustError: null|string;
    adjusting: null|"frame"|"refframe";

    adjustPositionWarning: null|PolarAlignPositionWarning;
    // When warning is not computed
    adjustPositionError: null|string;
}

export type AstrometryWizard = {
    id: string;
    title: string;

    paused: boolean;
    // Valid when !paused
    interruptible: boolean;
    // Valid when paused
    hasNext: null|string;

    polarAlignment?: PolarAlignStatus;
}

export type AstrometryStatus = {
    status: "empty"|"error"|"computing"|"ready";
    scopeStatus: "idle"|"moving"|"syncing";
    scopeReady: boolean;
    scopeMovedSinceImage: boolean;
    scopeDetails: string | null;
    lastOperationError: string|null;
    image: string | null;
    result: AstrometryResult|null;
    availableScopes: string [];
    selectedScope: string | null;
    settings: AstrometrySettings;
    // set during GOTOs
    target: {ra: number, dec:number}|null;

    // Set on first success (FIXME: should reset on camera change)
    narrowedField: number|null;
    // Set after one sync is ok (FIXME: should reset on mount/camera change)
    useNarrowedSearchRadius: boolean;

    runningWizard: null|AstrometryWizard;
}

export type ProcessConfiguration = {
    autorun: false;
    path: string| null;
    env: {[id:string]:string};
}

export type PhdGuideStep = {
    Timestamp: number;
    RADistanceRaw?: number,
    DECDistanceRaw?: number,
    settling?: boolean;
}


export type PhdSettling = {
    running: boolean;
    status?: boolean;
    error?: any;
}

export type PhdStar = {
    SNR: number;
    StarMass: number;
}

export type PhdAppState ="NotConnected" | "Guiding" | "Paused" | "Calibrating" | "Looping" | "Stopped" | "LostLock"; 

export type PhdStatus = {
    phd_started: boolean;
    connected: boolean;
    AppState: PhdAppState;
    settling: PhdSettling|null;
    guideSteps: {[id:string]: PhdGuideStep};
    configuration: ProcessConfiguration;
    firstStepOfRun: string;
    RADistanceRMS:number|null;
    DECDistanceRMS:number|null;
    RADECDistanceRMS:number|null;
    RADistancePeak: number|null;
    DECDistancePeak: number|null;
    RADECDistancePeak: number|null;
    star: PhdStar|null;
};

export type ToolConfig = {
    desc?: string;
    hidden?: boolean;
    trigger?: "atstart";
    confirm?: string;
    cmd: string[];
};

export type ToolExecuterStatus = {
    tools: {[id:string]:ToolConfig};
};

export type TriggerConfig = {
    desc: string;
    device: string;
    vector: string;
    property: string[]|string;
    value: string[]|string;
}

export type TriggerExecuterStatus = {
    triggers: {[id:string]:TriggerConfig};
}

export type BackofficeStatus = {
    apps: {[appId:string]: {enabled:boolean,position:number}};
    indiManager: IndiManagerStatus;
    camera: CameraStatus;
    astrometry: AstrometryStatus;
    focuser: FocuserStatus;
    phd: PhdStatus;
    toolExecuter: ToolExecuterStatus;
    triggerExecuter: TriggerExecuterStatus;
};