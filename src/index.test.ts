import {
    Inquiry,
    InquiryP,
    Fail,
    Pass,
    IOU,
    Questionset,
    Receipt,
    Question
} from './index';
import * as R from 'ramda';
import { Maybe } from 'simple-maybe';
import {
    Monad,
    InquiryMonad,
    IOUMonad,
    ReceiptMonad,
    QuestionsetMonad,
    PassFailMonad,
    PassMonad,
    FailMonad,
    InquiryValue
} from './inquiry-monad';

const oldEnough = (a: any) =>
    a.age > 13 ? Pass(['old enough']) : Fail(['not old enough']);

const findHeight = () => Pass([{ height: 110, in: 'cm' }]);
const nameSpelledRight = (a: any) =>
    a.name === 'Ron'
        ? Pass('Spelled correctly')
        : Fail(["Name wasn't spelled correctly"]);
const hasRecords = () => Pass([{ records: [1, 2, 3] }]);
const mathGrade = () => Fail(['Failed at math']);

function resolveAfter2Seconds(x: any) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(Pass('passed'));
        }, 2000);
    });
}

function resolveAfter1Second(x: any) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(Pass('passed'));
        }, 1000);
    });
}

function resolveAfter10ms(x: any) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(Pass('passed 10ms'));
        }, 10);
    });
}

describe('The module', () => {
    it('should satisfy the first monad law of left identity', () => {
        // this is trickier to do with a typed monad, but not impossible
        // we cannot just do some simple math as the value much adhere to type Inquiry
        // but the law seems to be provable with objects as much as they are with numbers

        const a: InquiryValue = {
            subject: Maybe.of(1),
            fail: Fail([]),
            pass: Pass([]),
            iou: IOU([]),
            informant: (_: any) => _,
            questionset: Questionset.of([['', () => {}]]),
            receipt: Receipt([])
        };

        const f = (n: InquiryValue): InquiryMonad =>
            Inquiry.of(
                Object.assign(n, {
                    subject: n.subject.map((x: number) => x + 1)
                })
            );

        // 1. unit = Inquiry; unit(x).chain(f) ==== f(x);
        const leftIdentity1 = Inquiry.of(a).chain(f);
        const leftIdentity2 = f(a);

        expect(leftIdentity1.join()).toEqual(leftIdentity2.join());

        const g = (n: InquiryValue): InquiryMonad =>
            Inquiry.of(
                Object.assign(n, {
                    subject: n.subject.map((x: number) => ({
                        value: x * 10,
                        string: `Something with the number ${x}`
                    }))
                })
            );

        // 1. unit = Inquiry; unit(x).chain(f) ==== f(x);
        const leftIdentity3 = Inquiry.of(a).chain(g);
        const leftIdentity4 = g(a);

        expect(leftIdentity3.join()).toEqual(leftIdentity4.join());
    });

    it('should satisfy the second monad law of right identity', () => {
        const a: InquiryValue = {
            subject: Maybe.of(3),
            fail: Fail([]),
            pass: Pass([]),
            iou: IOU([]),
            informant: (_: any) => _,
            questionset: Questionset.of([['', () => {}]]),
            receipt: Receipt([])
        };

        const rightIdentity1 = Inquiry.of(a).chain(Inquiry.of);
        const rightIdentity2 = Inquiry.of(a);

        // 2. unit = Inquiry; m = Inquiry.of(a); m.chain(unit) ==== m;
        expect(rightIdentity1.join()).toEqual(rightIdentity2.join());
    });

    it('should satisfy the third monad law of associativity', () => {
        const a: InquiryValue = {
            subject: Maybe.of(30),
            fail: Fail([]),
            pass: Pass([]),
            iou: IOU([]),
            informant: (_: any) => _,
            questionset: Questionset.of([['', () => {}]]),
            receipt: Receipt([])
        };

        const g = (n: InquiryValue): InquiryMonad =>
            Inquiry.of(
                Object.assign(n, {
                    subject: n.subject.map((x: number) => ({
                        value: x * 10,
                        string: `Something with the number ${x}`
                    }))
                })
            );
        const f = (n: InquiryValue): InquiryMonad =>
            Inquiry.of(
                Object.assign(n, {
                    subject: n.subject.map((x: number) => x + 1)
                })
            );

        // 3. m = Inquiry.of(a); m.chain(f).chain(g) ==== m.chain(x => f(x).chain(g))
        const associativity1 = Inquiry.of(a)
            .chain(g)
            .chain(f);
        const associativity2 = Inquiry.of(a).chain((x: InquiryValue) =>
            g(x).chain(f)
        );

        expect(associativity1.join()).toEqual(associativity2.join());
    });

    it('should be able to figure out if it is being passed another inquiry in the subject', () => {
        const inq1 = Inquiry.subject(1);
        const inq2 = Inquiry.subject(inq1);
        expect(inq2.join().subject.join()).toEqual(1);
    });

    it('should be able to make many checks and run a fork', () => {
        const result = Inquiry.subject({
            name: 'test',
            age: 14,
            description: 'blah'
        })
            .inquire(oldEnough)
            .inquire(findHeight)
            .inquire(nameSpelledRight)
            .inquire(hasRecords)
            .inquire(mathGrade)
            .fork(
                (x: FailMonad) => {
                    expect(x.inspect()).toBe(
                        "Fail(Name wasn't spelled correctly,Failed at math)"
                    );
                    return x.join();
                },
                (y: PassMonad) => {
                    expect(y.inspect()).toBe('this should not run');
                    return y.join();
                }
            );
    });

    it('should be able to make many checks and run a fold', () => {
        const result = Inquiry.subject({
            name: 'test',
            age: 14,
            description: 'blah'
        })
            .inquire(oldEnough)
            .inquire(findHeight)
            .inquire(nameSpelledRight)
            .inquire(hasRecords)
            .inquire(mathGrade)
            .fold(
                (x: PassMonad) => {
                    expect(x.inspect()).toBe(
                        'Pass(old enough,[object Object],[object Object])'
                    );
                    return x.join();
                },
                (y: FailMonad) => {
                    expect(y.inspect()).toBe('this should not run');
                    return y.join();
                }
            );
    });

    it('should be able to make many checks, including async ones, and run a conclude and return the subject unchanged', () => {
        return (InquiryP as any)
            .subject({ name: 'test', age: 10, description: 'blah' })
            .inquire(oldEnough)
            .inquire(findHeight)
            .inquire(resolveAfter2Seconds)
            .inquire(resolveAfter10ms)
            .inquire(nameSpelledRight)
            .inquire(hasRecords)
            .inquire(mathGrade)
            .conclude(
                (x: any) => {
                    expect(x.inspect()).toBe(
                        "Fail(not old enough,Name wasn't spelled correctly,Failed at math)"
                    );
                    return x;
                },
                (y: PassMonad) => {
                    expect(y.inspect()).toBe(
                        'Pass([object Object],[object Object],passed,passed 10ms)'
                    );
                    return y;
                }
            )
            .then((x: any) => {
                expect(x.subject.join()).toEqual({
                    name: 'test',
                    age: 10,
                    description: 'blah'
                });
                expect(R.head(x.pass.join())).toEqual({
                    // @ts-ignore
                    height: 110,
                    in: 'cm'
                });
            });
    });

    it('should be able to merge a sub-inquiry into a master inquiry', () => {
        const evaluateHealth = (a: any) =>
            (Inquiry as any)
                .subject(a)
                .inquire(() => Pass('Passed something'))
                .inquire(() => Fail('Failed something'))
                .inquire(() => Fail('Failed something else'));

        const result = (Inquiry as any)
            .subject({ name: 'test', age: 14, description: 'blah' })
            .inquire(oldEnough)
            .inquire(findHeight)
            .inquire(nameSpelledRight)
            .inquire(hasRecords)
            .inquire(mathGrade)
            .inquire(evaluateHealth)
            .conclude(
                (x: FailMonad) => {
                    expect(x.inspect()).toBe(
                        "Fail(Name wasn't spelled correctly,Failed at math,Failed something,Failed something else)"
                    );
                    return x.join();
                },
                (y: PassMonad) => {
                    expect(y.inspect()).toBe(
                        'Pass(old enough,[object Object],[object Object],Passed something)'
                    );
                    return y.join();
                }
            );
    });

    it('should be able to be stopped in the middle of processing with a breakpoint if there are failures', () => {
        const evaluateHealth = (a: any) =>
            (Inquiry as any)
                .subject(a)
                .inquire(() => Pass('Passed something'))
                .inquire(() => Fail('Failed something'))
                .inquire(() => Fail('Failed something else'));

        let reachedBreakpoint = 0;

        const result = (Inquiry as any)
            .subject({ name: 'test', age: 11, description: 'blah' })
            .inquire(oldEnough)
            .breakpoint((x: InquiryValue) => {
                // clearing the existing failure, it will not appear at the end
                // this is not a practical example, usually one one do some kind of exit
                reachedBreakpoint = 1;
                x.fail = Fail([]);

                return x;
            })
            .inquire(findHeight)
            .inquire(nameSpelledRight)
            .inquire(hasRecords)
            .inquire(mathGrade)
            .inquire(evaluateHealth)
            .conclude(
                (x: FailMonad) => {
                    expect(x.inspect()).toBe(
                        "Fail(Name wasn't spelled correctly,Failed at math,Failed something,Failed something else)"
                    );
                    expect(x.head()).toEqual("Name wasn't spelled correctly");
                    expect(x.tail()).toEqual('Failed something else');
                    expect(reachedBreakpoint).toEqual(1);
                    return x.join();
                },
                (y: PassMonad) => {
                    expect(y.inspect()).toBe(
                        'Pass([object Object],[object Object],Passed something)'
                    );
                    expect(y.head()).toEqual({ height: 110, in: 'cm' });
                    expect(y.tail()).toEqual('Passed something');
                    return y.join();
                }
            );
    });

    it('should be able to be stopped in the middle of processing with a milestone if there are passes', () => {
        const evaluateHealth = (a: any) =>
            (Inquiry as any)
                .subject(a)
                .inquire(() => Pass('Passed something'))
                .inquire(() => Fail('Failed something'))
                .inquire(() => Fail('Failed something else'));

        let reachedMilestone = 0;

        const result = (Inquiry as any)
            .subject({ name: 'test', age: 11, description: 'blah' })
            .inquire(oldEnough)
            .inquire(findHeight)
            .milestone((x: InquiryValue) => {
                // clearing the existing pass, it will not appear at the end
                // this is not a practical example, usually one one do some kind of exit
                reachedMilestone = 1;
                x.pass = Pass([]);
                return x;
            })
            .inquire(nameSpelledRight)
            .inquire(hasRecords)
            .inquire(mathGrade)
            .inquire(evaluateHealth)
            .conclude(
                (x: FailMonad) => {
                    expect(x.inspect()).toBe(
                        "Fail(not old enough,Name wasn't spelled correctly,Failed at math,Failed something,Failed something else)"
                    );
                    expect(reachedMilestone).toEqual(1);
                    return x.join();
                },
                (y: PassMonad) => {
                    expect(y.inspect()).toBe(
                        'Pass([object Object],Passed something)'
                    );
                    return y.join();
                }
            );
    });

    it('should be able to make many checks, including async ones, and run a faulted unwrap', () => {
        return (InquiryP as any)
            .subject({ name: 'test', age: 10, description: 'blah' })
            .inquire(oldEnough)
            .inquire(findHeight)
            .inquire(resolveAfter1Second)
            .inquire(nameSpelledRight)
            .inquire(hasRecords)
            .inquire(mathGrade)
            .faulted((x: FailMonad) => {
                expect(x.inspect()).toBe(
                    "Fail(not old enough,Name wasn't spelled correctly,Failed at math)"
                );
                return x;
            });
    });

    it('should be able to make many checks, including async ones, run await, then and run a faulted unwrap', () => {
        return (InquiryP as any)
            .subject({ name: 'test', age: 10, description: 'blah' })
            .inquire(oldEnough)
            .inquire(findHeight)
            .inquire(resolveAfter1Second)
            .inquire(nameSpelledRight)
            .inquire(hasRecords)
            .inquire(mathGrade)
            .await(2000)
            .then((inq: InquiryMonad) =>
                inq.faulted((x: FailMonad) => {
                    expect(x.inspect()).toBe(
                        "Fail(not old enough,Name wasn't spelled correctly,Failed at math)"
                    );
                    return x;
                })
            );
    });

    it('should be able to make many checks, including async ones, and run a cleared unwrap when all passes', () => {
        return (InquiryP as any)
            .subject({ name: 'test', age: 14, description: 'blah' })
            .inquire(oldEnough)
            .inquire(findHeight)
            .inquire(resolveAfter1Second)
            .inquire(hasRecords)
            .faulted((x: FailMonad) => {
                expect(x.inspect()).toBe(
                    "Fail(not old enough,Name wasn't spelled correctly,Failed at math)"
                );
                return x;
            });
    });

    it('should all an inquire to return a non-Fail, non-Pass, and accept it as a Pass', () => {
        return (InquiryP as any)
            .subject(1)
            .inquire((x: any) => x + 1)
            .suffice((pass: PassFailMonad) => {
                expect(pass.join()).toEqual([2]);
            });
    });

    it('should be able to map a function as an inquireMap', () => {
        const planets = [
            'Mercury',
            'Venus',
            'Earth',
            'Mars',
            'Jupiter',
            'Saturn',
            'Uranus',
            'Neptune'
        ];

        const startsWith = (word: string) => (checks: any) =>
            word.startsWith(checks.letter) ? Pass(word) : Fail(word);

        (Inquiry as any)
            .subject({ letter: 'M' })
            .inquireMap(startsWith, planets)
            .suffice((pass: PassFailMonad) => {
                expect(pass.join()).toEqual(['Mercury', 'Mars']);
            });
    });

    it('should be able to map a function as an inquireMap with InquiryP', () => {
        const planets = [
            'Mercury',
            'Venus',
            'Earth',
            'Mars',
            'Jupiter',
            'Saturn',
            'Uranus',
            'Neptune'
        ];

        const startsWith = (word: string) => (checks: any) =>
            word.startsWith(checks.letter) ? Pass(word) : Fail(word);

        return (InquiryP as any)
            .subject({ letter: 'M' })
            .inquire(resolveAfter1Second)
            .inquire(resolveAfter10ms)
            .inquireMap(startsWith, planets)
            .inquire(resolveAfter10ms)
            .suffice((pass: PassFailMonad) => {
                expect(pass.join()).toEqual([
                    'Mercury',
                    'Mars',
                    'passed',
                    'passed 10ms',
                    'passed 10ms'
                ]);
            });
    });

    it('can handle Questionsets', (done: Function) => {
        const questionSet = Questionset.of([
            [
                'does it start with a capital letter?',
                (a: string): PassFailMonad =>
                    /^[A-Z]/.test(a)
                        ? Pass('starts with a capital')
                        : Fail('does not start with a capital')
            ],
            [
                'are there more than ten words?',
                (a: string): PassFailMonad =>
                    a.split(' ').length > 10
                        ? Pass('more than ten words')
                        : Fail('ten words or less')
            ],
            [
                /^are there any line breaks\?$/,
                (a: string): PassFailMonad =>
                    /\r|\n/.exec(a)
                        ? Pass('there were line breaks')
                        : Fail('no line breaks')
            ],
            [
                'is this question ever asked?',
                (a: string): FailMonad => Fail('never should be asked')
            ]
        ]);

        return Inquiry.subject('A short sentence.')
            .using(questionSet)
            .inquire('does it start with a capital letter?')
            .inquire('are there more than ten words?')
            .inquire('are there any line breaks?')
            .conclude(
                (fail: FailMonad) => {
                    expect(fail.join()).toEqual([
                        'ten words or less',
                        'no line breaks'
                    ]);
                },
                (pass: PassMonad) => {
                    expect(pass.join()).toEqual(['starts with a capital']);
                    setTimeout(done, 1);
                }
            );
    });

    it('can handle Questionsets and do inquireAll', (done: Function) => {
        const questionSet = Questionset.of([
            [
                'does it start with a capital letter?',
                (a: string): PassFailMonad =>
                    /^[A-Z]/.test(a)
                        ? Pass('starts with a capital')
                        : Fail('does not start with a capital')
            ],
            [
                'are there more than ten words?',
                (a: string): PassFailMonad =>
                    a.split(' ').length > 10
                        ? Pass('more than ten words')
                        : Fail('ten words or less')
            ],
            [
                /^are there any line breaks\?$/,
                (a: string): PassFailMonad =>
                    /\r|\n/.exec(a)
                        ? Pass('there were line breaks')
                        : Fail('no line breaks')
            ]
        ]);

        return Inquiry.subject('A short sentence.')
            .using(questionSet)
            .inquireAll()
            .conclude(
                (fail: FailMonad) => {
                    expect(fail.join()).toEqual([
                        'ten words or less',
                        'no line breaks'
                    ]);
                },
                (pass: PassMonad) => {
                    expect(pass.join()).toEqual(['starts with a capital']);
                    setTimeout(done, 1);
                }
            );
    });

    it('can handle Questionsets in async', (done: Function) => {
        const questionSet = Questionset.of([
            [
                'does it start with a capital letter?',
                (a: string): PassFailMonad =>
                    /^[A-Z]/.test(a)
                        ? Pass('starts with a capital')
                        : Fail('does not start with a capital')
            ],
            [
                'are there more than ten words?',
                (a: string): PassFailMonad =>
                    a.split(' ').length > 10
                        ? Pass('more than ten words')
                        : Fail('ten words or less')
            ],
            [
                /^are there any line breaks\?$/,
                (a: string): PassFailMonad =>
                    /\r|\n/.exec(a)
                        ? Pass('there were line breaks')
                        : Fail('no line breaks')
            ],
            [
                'pause for a moment',
                (a: string): Promise<PassFailMonad> =>
                    new Promise(resolve => {
                        setTimeout(() => {
                            resolve(Pass('passed 15ms'));
                        }, 15);
                    })
            ],
            [
                'is this question ever asked?',
                (a: string): PassFailMonad => Fail('never should be asked')
            ]
        ]);

        const usedQs: any[] = [];

        return InquiryP.subject('A short sentence.')
            .using(questionSet)
            .informant(([n, x]: Array<any>) => usedQs.push([n, x]))
            .inquire('does it start with a capital letter?')
            .inquire('are there more than ten words?')
            .inquire('are there any line breaks?')
            .inquire('pause for a moment')
            .conclude(
                (fail: FailMonad) => {
                    expect(fail.join()).toEqual([
                        'ten words or less',
                        'no line breaks'
                    ]);
                },
                (pass: PassMonad) => {
                    expect(pass.join()).toEqual([
                        'starts with a capital',
                        'passed 15ms'
                    ]);

                    // verify informant
                    expect(usedQs[0][0]).toEqual(
                        'does it start with a capital letter?'
                    );
                    expect(usedQs[0][1].inspect()).toEqual(
                        'Pass(starts with a capital)'
                    );

                    expect(usedQs[1][0]).toEqual(
                        'are there more than ten words?'
                    );
                    expect(usedQs[1][1].inspect()).toEqual(
                        'Fail(ten words or less)'
                    );

                    expect(usedQs[2][0]).toEqual('are there any line breaks?');
                    expect(usedQs[2][1].inspect()).toEqual(
                        'Fail(no line breaks)'
                    );

                    expect(usedQs[3][0]).toEqual('pause for a moment');
                    expect(usedQs[3][1].inspect()).toEqual('Pass(passed 15ms)');
                    setTimeout(done, 1);
                }
            )
            .then((inq: InquiryValue) => {
                expect(inq.receipt.join()[0][0]).toEqual(
                    'does it start with a capital letter?'
                );
                expect(inq.receipt.join()[0][1].inspect()).toEqual(
                    'Pass(starts with a capital)'
                );
                expect(inq.receipt.join()[1][0]).toEqual(
                    'are there more than ten words?'
                );
                expect(inq.receipt.join()[1][1].inspect()).toEqual(
                    'Fail(ten words or less)'
                );
                expect(inq.receipt.join()[2][0]).toEqual(
                    'are there any line breaks?'
                );
                expect(inq.receipt.join()[2][1].inspect()).toEqual(
                    'Fail(no line breaks)'
                );
                expect(inq.receipt.join()[3][0]).toEqual('pause for a moment');
                expect(inq.receipt.join()[3][1].inspect()).toEqual(
                    'Pass(passed 15ms)'
                );
            });
    });

    it('can handle Questionsets and do inquireAll', (done: Function) => {
        const questionSet = Questionset.of([
            [
                'does it start with a capital letter?',
                (a: string): PassFailMonad =>
                    /^[A-Z]/.test(a)
                        ? Pass('starts with a capital')
                        : Fail('does not start with a capital')
            ],
            [
                'are there more than ten words?',
                (a: string): PassFailMonad =>
                    a.split(' ').length > 10
                        ? Pass('more than ten words')
                        : Fail('ten words or less')
            ],
            [
                'pause for a moment',
                (a: string): Promise<PassFailMonad> =>
                    new Promise(resolve => {
                        setTimeout(() => {
                            resolve(Pass('passed 15ms'));
                        }, 15);
                    })
            ],
            [
                /^are there any line breaks\?$/,
                (a: string) =>
                    /\r|\n/.exec(a)
                        ? Pass('there were line breaks')
                        : Fail('no line breaks')
            ]
        ]);

        return InquiryP.subject('A short sentence.')
            .using(questionSet)
            .inquireAll()
            .conclude(
                (fail: FailMonad) => {
                    expect(fail.join()).toEqual([
                        'ten words or less',
                        'no line breaks'
                    ]);
                },
                (pass: PassMonad) => {
                    expect(pass.join()).toEqual([
                        'starts with a capital',
                        'passed 15ms'
                    ]);
                    setTimeout(done, 1);
                }
            );
    });

    it('should be able to map a Questionset as an inquireMap', () => {
        const planets = [
            'Mercury',
            'Venus',
            'Earth',
            'Mars',
            'Jupiter',
            'Saturn',
            'Uranus',
            'Neptune'
        ];

        const questionSet = Questionset.of([
            [
                'does it start with the letter provided?',
                (word: string): Function => (checks: any): PassFailMonad =>
                    word.startsWith(checks.letter) ? Pass(word) : Fail(word)
            ]
        ]);

        Inquiry.subject({ letter: 'M' })
            .using(questionSet)
            .inquireMap('does it start with the letter provided?', planets)
            .suffice((pass: PassMonad) => {
                expect(pass.join()).toEqual(['Mercury', 'Mars']);
            });
    });

    it('should be able to map a Questionset as an inquireMap with InquiryP', () => {
        const planets = [
            'Mercury',
            'Venus',
            'Earth',
            'Mars',
            'Jupiter',
            'Saturn',
            'Uranus',
            'Neptune'
        ];

        const questionSet = Questionset.of([
            [
                'does it start with the letter provided?',
                (word: string) => (checks: any) =>
                    word.startsWith(checks.letter) ? Pass(word) : Fail(word)
            ]
        ]);

        return InquiryP.subject({ letter: 'M' })
            .using(questionSet) // .using -- should this just mean check everything? why bother with .inquire?
            .inquire(resolveAfter1Second)
            .inquire(resolveAfter10ms)
            .inquireMap('does it start with the letter provided?', planets)
            .inquire(resolveAfter10ms)
            .suffice((pass: PassMonad) => {
                expect(pass.join()).toEqual([
                    'Mercury',
                    'Mars',
                    'passed',
                    'passed 10ms',
                    'passed 10ms'
                ]);
            });
    });

    it('should be able to handle Questions', (done: Function) => {
        const subject = {
            flagged: true,
            score: 15,
            started: 1530293458
        };

        const notFlagged = Question.of([
            'is it not flagged?',
            (x: any): PassFailMonad =>
                !x.flagged ? Pass('was not flagged') : Fail('was flagged')
        ]);

        const passingScore = Question.of([
            'is the score higher than 10?',
            (x: any): PassFailMonad =>
                x.score > 10
                    ? Pass('Score higher than 10')
                    : Fail('Score not higher than 10')
        ]);

        const pauseMoment = Question.of([
            'pause for a moment',
            (a: string): Promise<PassFailMonad> =>
                new Promise((_, reject) => {
                    setTimeout(() => {
                        reject(Fail('failed 15ms'));
                    }, 15);
                })
        ]);

        return InquiryP.subject(subject)
            .inquire(notFlagged)
            .inquire(passingScore)
            .inquire(pauseMoment)
            .conclude(
                (fail: FailMonad) => {
                    expect(fail.join()).toEqual(['was flagged', 'failed 15ms']);
                },
                (pass: PassMonad) => {
                    expect(pass.join()).toEqual(['Score higher than 10']);
                    setTimeout(done, 1);
                }
            );
    });

    it('should be able to handle Questions in InquiryP without IOUs', (done: Function) => {
        const subject = {
            flagged: true,
            score: 15,
            started: 1530293458
        };

        const notFlagged = Question.of([
            'is it not flagged?',
            (x: any): PassFailMonad =>
                !x.flagged ? Pass('was not flagged') : Fail('was flagged')
        ]);

        const passingScore = Question.of([
            'is the score higher than 10?',
            (x: any): PassFailMonad =>
                x.score > 10
                    ? Pass('Score higher than 10')
                    : Fail('Score not higher than 10')
        ]);

        return InquiryP.subject(subject)
            .inquire(notFlagged)
            .inquire(passingScore)
            .conclude(
                (fail: FailMonad) => {
                    expect(fail.join()).toEqual(['was flagged']);
                },
                (pass: PassMonad) => {
                    expect(pass.join()).toEqual(['Score higher than 10']);
                    setTimeout(done, 1);
                }
            );
    });

    it('should be able to concatenate Questionsets', () => {
        const q1 = Questionset.of([
            ['first question?', (x: any) => Pass(1)],
            ['second question?', (x: any) => Fail(2)]
        ]);

        const q2 = Questionset.of([['third question?', (x: any) => Pass(3)]]);

        expect((q1 as QuestionsetMonad).concat(q2).join().length).toBe(3);

        expect((q1 as QuestionsetMonad).concat(q2).join()[2][0]).toBe(
            'third question?'
        );

        expect((q1 as QuestionsetMonad).concat(q2).join()[0][0]).toBe(
            'first question?'
        );
    });

    it('can handle Questionsets and do inquireAll with rejections', (done: Function) => {
        const questionSet = Questionset.of([
            [
                'does it start with a capital letter?',
                (a: string): PassFailMonad =>
                    /^[A-Z]/.test(a)
                        ? Pass('starts with a capital')
                        : Fail('does not start with a capital')
            ],
            [
                'are there more than ten words?',
                (a: string): PassFailMonad =>
                    a.split(' ').length > 10
                        ? Pass('more than ten words')
                        : Fail('ten words or less')
            ],
            [
                'pause for a moment with fail',
                (a: string): Promise<PassFailMonad> =>
                    new Promise((_, reject) => {
                        setTimeout(() => {
                            reject(Fail('failed 15ms'));
                        }, 15);
                    })
            ],
            [
                'pause for a moment with pass',
                (a: string): Promise<PassFailMonad> =>
                    new Promise((resolve) => {
                        setTimeout(() => {
                            resolve(Pass('passed 10ms'));
                        }, 10);
                    })
            ],
            [
                /^are there any line breaks\?$/,
                (a: string) =>
                    /\r|\n/.exec(a)
                        ? Pass('there were line breaks')
                        : Fail('no line breaks')
            ]
        ]);

        return InquiryP.subject('A short sentence.')
            .using(questionSet)
            .inquireAll()
            .conclude(
                (fail: FailMonad) => {
                    expect(fail.join()).toEqual([
                        'ten words or less',
                        'no line breaks',
                        'failed 15ms'
                    ]);
                },
                (pass: PassMonad) => {
                    expect(pass.join()).toEqual(['starts with a capital', 'passed 10ms']);
                    setTimeout(done, 1);
                }
            );
    });
});
