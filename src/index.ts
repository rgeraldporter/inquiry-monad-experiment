import * as R from "ramda";

const Pass = (x: any): PassMonad => ({
    map: (f: Function) => Pass(f(x)),
    chain: (f: Function) => f(x),
    fold: (f: Function, _: Function) => f(x),
    fork: (_: Function, f: Function) => f(x),
    join: () => x,
    inspect: () => <string>`Pass(${x})`,
    concat: (o: PassFailMonad) => o.fold((r: any) => Pass(x.concat(r)), null),
    ap: (y: PassFailMonad) => (y.isPass ? y.concat(Pass(x)) : Pass(x)),
    isPass: true,
    isFail: false,
    isInquiry: true
});

const Fail = (x: any): FailMonad => ({
    map: (f: Function) => Fail(f(x)),
    chain: (f: Function) => f(x),
    fold: (_: Function, f: Function) => f(x),
    fork: (f: Function, _: Function) => f(x),
    join: () => x,
    inspect: () => <string>`Fail(${x})`,
    concat: (o: PassFailMonad) => o.fork((r: any) => Fail(x.concat(r)), null),
    ap: (y: PassFailMonad) => (y.isPass ? Fail(x) : y.concat(Fail(x))),
    isPass: false,
    isFail: true,
    isInquiry: true
});

const _failInquire = (x: Inquiry, y: FailMonad) =>
    Inquiry({ fail: x.fail.concat(y), pass: x.pass });
const _passInquire = (x: Inquiry, y: PassMonad) =>
    Inquiry({ fail: x.fail, pass: x.pass.concat(y) });

const Inquiry = (x: Inquiry) => ({
    isInquiry: true,
    inquire: (
        f: Function // @todo memoize or something
    ) => (f(x).isPass ? _passInquire(x, f(x)) : _failInquire(x, f(x))),
    swap: (): InquiryMonad =>
        Inquiry({
            fail: Fail(x.pass.join()),
            pass: Pass(x.fail.join())
        }),
    inspect: (): string => `Inquiry(${x.fail.inspect()} ${x.pass.inspect()}`,
    map: (f: Function): Inquiry => (Inquiry as any).of(f(x)), // cast required for now
    ap: (y: Monad) => y.map(x),
    chain: (f: Function) => f(x),

    // unwraps : Fork and Fold may need renaming as they don't act as you'd expect.
    // because they will run BOTH tracks
    fold: (f: Function, g: Function): Inquiry => ({
        pass: f(x.pass),
        fail: g(x.fail)
    }),
    fork: (f: Function, g: Function): Inquiry => ({
        fail: f(x.fail),
        pass: g(x.pass)
    }),
    zip: (f: Function): Array<any> => f(x.fail.join().concat(x.pass.join())), // bring together
    join: (): any => x
});

Inquiry.constructor.prototype["of"] = (x: any) =>
    R.prop("isInquiry", x) ? x : Inquiry({ fail: Fail([]), pass: Pass([]) });

export {Inquiry, Fail, Pass};