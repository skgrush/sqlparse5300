
export const selectTests = [

`SELECT *
FROM employee CROSS JOIN department;`,

`SELECT *
FROM employee, department;`,

`select g.*
from users u inner join groups g on g.Userid = u.Userid
where u.LastName = 'Smith'
and u.FirstName = 'John'`,

`select g.GroupName, count(g.*) as NumberOfMembers
from users u inner join groups g on g.Userid = u.Userid
group by GroupName`,

`SELECT employee.LastName, employee.DepartmentID, department.DepartmentName
FROM employee
INNER JOIN department ON
employee.DepartmentID = department.DepartmentID`,

`SELECT *
FROM employee INNER JOIN department USING (DepartmentID);`,

`SELECT *
FROM employee FULL OUTER JOIN department
  ON employee.DepartmentID = department.DepartmentID;`,

`SELECT F.EmployeeID, F.LastName, S.EmployeeID, S.LastName, F.Country
FROM Employee F INNER JOIN Employee S ON F.Country = S.Country
WHERE F.EmployeeID < S.EmployeeID
ORDER BY F.EmployeeID, S.EmployeeID;`,

`SELECT * FROM T ORDER BY C1 DESC;`,

`select g.GroupName, count(g.*) as NumberOfMembers
from users u inner join groups g on g.Userid = u.Userid
group by GroupName`,

`select g.GroupName, count(g.*) as NumberOfMembers
from users u inner join groups g on g.Userid = u.Userid
group by GroupName
having count(g.*) > 5`,

`SELECT \`loan-number\`, \`branch-name\`, amount * 100
FROM    loan`,

`SELECT DISTINCT loan-number
FROM loan
WHERE amount between 90000 and 100000`,

`SELECT P.\`P#\`, 'Weight in Grams = ', P.Weight * 454
FROM P;`,

`SELECT Supplier_name = Sname , STATUS
  FROM S
  WHERE CITY = ‘Paris’;`,

`SELECT P.*
FROM P
WHERE P.City NOT LIKE '%E'`,

`SELECT COUNT (DISTINCT \`S#\`)
 FROM SP`,

`SELECT Sname
  FROM  S
  WHERE \`S#\` IN
    ( SELECT \`S#\`
        FROM SP
        WHERE \`P# = 'P_2' );`,

`SELECT Sname
  FROM S
  WHERE \`S#\` IN ('S1', 'S2', 'S3', 'S4');`,

`SELECT \`S#\`
  FROM S
  WHERE STATUS <
    ( SELECT MAX(STATUS)
      FROM S );`,

]
