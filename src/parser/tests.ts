
import {Rel} from './types'

export const selectTests = [

`-- Query a
SELECT      S.sid, S.sname, S.rating, S.age
FROM        Sailors AS S
WHERE       S.rating > 7`,

`-- Query b (invalid)
SELECT      S.sid, S.sname
FROM        Sailors AS S
WHERE       S.color = ‘green’`,

`--Query c
SELECT      B.color
FROM        Sailors AS S,  Reserves AS R, Boats AS B
WHERE       S.sid=R.sid AND R.bid=B.bid AND S.sname = ‘Lubber’`,

`--Query d
SELECT      sname
FROM        Sailors, Boats, Reserves
WHERE     Sailors.sid=Reserves.sid AND Reserves.bid=Boats.bid AND Boats.color=‘red’
UNION
SELECT      sname
FROM        Sailors, Boats, Reserves
WHERE     Sailors.sid=Reserves.sid AND Reserves.bid=Boats.bid AND Boats.color=‘green’
`,

`--Query e (invalid)
-- day is a reserved word
SELECT    S.sname
FROM       Sailors AS S,  Reserves AS R
WHERE    R.sid = S.sid AND R.bid = 100 AND R.rating > 5 AND R.day = ‘8/9/09’
`,

`--Query f
SELECT      sname
FROM        Sailors, Boats, Reserves
WHERE     Sailors.sid=Reserves.sid AND Reserves.bid=Boats.bid AND
Boats.color=’red’
INTERSECT
SELECT      sname
FROM        Sailors, Boats, Reserves
WHERE     Sailors.sid=Reserves.sid AND Reserves.bid=Boats.bid AND
Boats.color=’green’
`,

`--Query g
SELECT      S.sid
FROM        Sailors AS S,  Reserves AS R, Boats AS B
WHERE     S.sid=R.sid AND R.bid=B.bid AND B.color=‘red’
EXCEPT
SELECT      S2.sid
FROM        Sailors AS S2,  Reserves AS R2, Boats AS B2
WHERE     S2.sid=R2.sid AND R2.bid=B2.bid AND B2.color=‘green’
`,

`--Query h
SELECT     S.sname
FROM      Sailors AS S
WHERE     S.sid IN ( SELECT   R.sid
                     FROM     Reserves AS R
                     WHERE   R.bid = 103)
`,

`--Query i
SELECT      S.sname
FROM        Sailors AS S
WHERE     S.sid IN ((SELECT   R.sid
         FROM     Reserves AS R, Boats AS B
         WHERE   R.bid = B.bid AND B.color = ‘red’)
         INTERSECT
         (SELECT   R2.sid
         FROM     Reserve AS R2, Boats AS B2
         WHERE   R2.bid = B2.bid AND B2.color = ‘green’))
`,

`--Query j
SELECT     S.sname
FROM        Sailors S
WHERE     EXISTS (SELECT   B.bid
     FROM     Boats B
     WHERE   EXISTS (SELECT   R.bid
       FROM      Reserves R
       WHERE   R.bid = B.bid AND
             R.sid = S.sid))
`,

`--Query k
SELECT    S.sname
FROM       Sailors S
WHERE    S.age > (SELECT    MAX (S2.age)
         FROM       Sailors S2
         WHERE    S2.rating = 10)
`,

`--Query l
SELECT     B.bid, Count (*) AS reservationcount
FROM        Boats B, Reserves R
WHERE     R.bid=B.bid AND B.color = ‘red’
GROUP BY B.bid
`,

`--Query m
SELECT      B.bid, Count (*) AS reservationcount
FROM         Boats B, Reserves R
WHERE      R.bid=B.bid AND B.color = ‘red’
GROUP BY B.bid
HAVING    B.color = ‘red’
`,

`--Query n (invalid)
SELECT    Sname
FROM       Sailors
WHERE    Sailor.sid   IN (SELECT   Reserves.bid, Reserves.sid
   FROM     Reserves
   CONTAINS
    (SELECT Boats.bid
     FROM  Boats
     WHERE    bname  =  ‘interlake’) )
`,

`--Query o (fixed)
SELECT      S.rating, Avg (S.age) As average
FROM        Sailors S
WHERE     S.age > 18
GROUP BY S.rating
HAVING    Count (*) > 1
`
]

export type ResultTuple = [null|Error|object,
                           null|Error|Rel.HighLevelRelationish]
export const selectResults: ResultTuple[] =
  selectTests.map(() => [null, null] as ResultTuple)
