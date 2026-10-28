# Mutation audit

A standard step before an algorithm's Watch and Do it PRs are merged: insert realistic bugs on
purpose, run the tests, and check that they fail. Any bug the tests miss is a gap; close it with
a test whose expected values are traced by hand from a textbook version of the algorithm (the
trace written in a comment), never copied from the code's output.

Give a reviewer (a fresh agent) this prompt, with the sort's name filled in:

```
SORT TO AUDIT: <name>
TASK: a MUTATION AUDIT of the sort above, to prove its tests catch
wrong algorithms. READ-ONLY: git status must be clean; work on a
throwaway branch audit/tmp-mutations; never commit or push; never run
vitest -u; never edit snapshots. List 5-8 realistic bugs (incl. one in
what the learner SEES and one in Do it's answer checking); apply each
alone, run ALL the sort's relevant tests, record caught/not caught and
by which test, undo it. Check whether tests use hand-traced or
independent expected values or only compare the code to itself. Then
switch to main, delete the branch, confirm clean. Report a table, the
bugs that slipped through with the smallest hand-traced test for each,
and the self-comparing tests. Don't write tests.
```

Then close each gap with a hand-traced test, and prove it is real: re-apply the bug it targets,
confirm the new test fails, and undo the bug.
