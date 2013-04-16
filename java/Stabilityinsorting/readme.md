Stability in sorting algorithms

Stability in sorting refers to maintaining the relative positions of elements after sorting. This can be written as:  

i < j and a[i] ~ a[j] π(i) < π(j). [1]

Where i and j are the positions of the elements and π is the post-sorted position of the element. The ~ means that the two elements are equivalent in respect to how they will be sorted. 
For example, given a list of students and their grades (Table 1a), one might like to sort the list by grade and within each grade sort the names alphabetically. In order for this to be possible, the sorting algorithm must be stable. First, the list would be sorted alphabetically (Table 1b), then by grade (Table 1c). When sorting by grade, the relative positions of the already alphabetized names would remain constant. 
Smith, A
Brown
Lee
Smith, J
Sutherland
Johnson
Lennard
B
A
A
A
B
C
A



Brown
Johnson
Lee
Lennard 
Smith, A
Smith, J
Sutherland
A
C
A
A
B
A
B

Brown
Lee
Lennard
Smith, J
Smith, A
Sutherland
Johnson
A
A
A
A
B
B
C
Table 1a (unsorted)           Table 1b (alphabetical)	        Table 1c (alphabetical & by grade)
Table 1 – A list unsorted (a), then sorted in 2 steps (b and c) by a stable sorting algorithm.

	If sorting had been unstable, the list sorted by grades would have randomly positioned each name within a grade, not necessarily maintaining the alphabetical order. Using an unstable sorting algorithm might produce a list. Three possible outcomes if such a two tier sort is attempted using an unstable sorting algorithm are illustrated in table 2.
Lee
Lennard
Brown
Smith, J
Smith, A
Sutherland
Johnson
A
A
A
A
B
B
C



Lee
Brown
Lennard
Smith, J
Sutherland
Smith, A
Johnson
A
A
A
A
B
B
C

Brown
Lennard
Lee
Smith, J
Sutherland
Smith, A
Johnson
A
A
A
A
B
B
C
Table 2a 		         Table 2b 			         Table 2c 
Table 2 – Possible outcomes of sorting by grade, after having sorted by name, when the sorting algorithm used is unstable.

All three of these outcomes are correctly sorted with respect to grade, but they did not maintain the relative position of the elements, as they would if a stable sorting algorithm had been used. 
Selectionsort is an example of an unstable sort. This algorithm goes through a list from left to right and finds the element for the first position, then the second, and third, etc. The element it might be swapped with may be past one of its equivalent elements. For example, the list 2a, 2b, 1 (where a and b are “invisible markers” to give the original relative position) would be sorted to 1, 2b, 2a, because in the first loop, 2a would be swapped with1. 
Quicksort is another example of an unstable sorting algorithm. In Quicksort elements, called keys, are compared to a chosen “pivot” and if greater than the pivot, put on the right side of it. This is done multiple times until the list is sorted. During this partitioning process, elements might be moved past equivalent keys. 
One could achieve stability with either Selectionsort or Quicksort by appending a small index to each element listing relative positions. With Selectionsort this would be relatively easy to do. However, this would be rather difficult to do with Quicksort, because it would cause a lot more partitioning, subsequently slowing down the sort. 
Insertionsort is an example of a stable sort. It goes through a list element by element, moving all the elements in front of it that are larger than it to the right, and “inserting” that element into it’s correct place. This means that the relative position of equal elements is maintained, because only elements larger than the element being moved are shifted. Any equivalent element that was previously to the left would remain to the left. 
	Mergesort is an excellent example of a stable sorting algorithm. The elements are only moved during the merges. Therefore, this is the only time equivalent elements could be reversed in order. Using the appropriate inequality symbols, this can be completely avoided so that the relative position is not affected by merging.  

References
1. Sorting Algorithms: Stability. University of Illinois, Chicago. <http://www.uic.edu/classes/mcs/mcs401/r03/stability.pdf>
2. Sedgewick, Robert. Algorithms in C++.  Reading: Addison-Wesley, 1992. 
