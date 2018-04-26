declare module 'simple-maybe'

interface Monad {
    map: Function;
    chain: Function;
    join: Function;
    inspect(): string;
    ap: Function;
}

interface PassFailMonad extends Monad {
    fold: Function;
    fork: Function;
    concat: Function;
    isPass: boolean;
    isFail: boolean;
    isInquiry: false;
    answer: Function;
    head: Function;
    tail: Function;
    isEmpty: Function;
}

interface IOUMonad extends Monad {
    concat: Function;
    head: Function;
    tail: Function;
    isEmpty: Function;
}

interface PassMonad extends PassFailMonad {
    isPass: true;
    isFail: false;
}

interface FailMonad extends PassFailMonad {
    isPass: false;
    isFail: true;
}

interface Inquiry {
    subject: any;
    fail: FailMonad;
    pass: PassMonad;
    informant: Function;
    iou: IOUMonad;
    of?: Function;
}

interface InquiryMonad extends Monad {
    inquire: Function;
    zip: Function;
    swap: Function;
    fork: Function;
    faulted: Function;
    cleared: Function;
}