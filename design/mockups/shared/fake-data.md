# Mockup fake data

Directions A, B and C freeze the same bubble sort step, so they can be
compared on style alone. Direction D uses a later step in the same run (see below).

- **Input:** `[5, 2, 8, 1, 9, 3]`
- **Array at this step:** `[2, 1, 5, 8, 3, 9]` (pass 1 is done; 9 is in its final place)
- **Step:** pass `i = 1`, `j = 2`, comparing `a[2] = 5` with `a[3] = 8`
- **Highlights:** comparing `[2, 3]`, sorted `[5]`
- **Pointers:** `j = 2`, `j+1 = 3`
- **Stats:** 8 comparisons, 4 swaps
- **Active line:** 6 (`if a[j] > a[j + 1]:`)
- **Explanation**
  - Explorer: "Is 5 bigger than 8? No. They're already in the right order, so they stay put."
  - Engineer: "Compare a[2] = 5 with a[3] = 8. Since 5 ≤ 8 the pair is in order: no swap, j
    advances."

## Source (Python)

```python
def bubble_sort(a):
    n = len(a)
    for i in range(n - 1):
        swapped = False
        for j in range(n - 1 - i):
            if a[j] > a[j + 1]:
                a[j], a[j + 1] = a[j + 1], a[j]
                swapped = True
        if not swapped:
            break
    return a
```

## Trace table

| i   | j   | a[j] | a[j+1] | swap? |
| --- | --- | ---- | ------ | ----- |
| 0   | 0   | 5    | 2      | yes   |
| 0   | 1   | 5    | 8      | no    |
| 0   | 2   | 8    | 1      | yes   |
| 0   | 3   | 8    | 9      | no    |
| 0   | 4   | 9    | 3      | yes   |
| 1   | 0   | 2    | 5      | no    |
| 1   | 1   | 5    | 1      | yes   |
| 1   | 2   | 5    | 8      | —     |

Explorer column labels: round, spot, left, right, swap?

## Direction D's later step

Direction D freezes the same run later on, so its trace table has more history to show.

- **Array at this step:** `[1, 2, 5, 3, 8, 9]` (passes 1 and 2 are done; 8 and 9 are final)
- **Step:** pass `i = 2`, `j = 2`, comparing `a[2] = 5` with `a[3] = 3`
- **Highlights:** comparing `[2, 3]`, sorted `[4, 5]`
- **Stats:** 12 comparisons, 6 swaps (step 19 of 22)
- **Explanation**
  - Explorer: "Is 5 bigger than 3? Yes! They're in the wrong order, so they'll trade places."
  - Engineer: "Compare a[2] = 5 with a[3] = 3. Since 5 > 3 the pair is out of order, so the
    next step swaps them."
- **Trace table:** the 8 rows above, then:

| i   | j   | a[j] | a[j+1] | swap? |
| --- | --- | ---- | ------ | ----- |
| 1   | 2   | 5    | 8      | no    |
| 1   | 3   | 8    | 3      | yes   |
| 2   | 0   | 2    | 1      | yes   |
| 2   | 1   | 2    | 5      | no    |
| 2   | 2   | 5    | 3      | ?     |
