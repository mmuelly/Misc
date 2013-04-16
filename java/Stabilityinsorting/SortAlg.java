// ***********************************************
// Michael C. Muelly, 2004
// ***********************************************

import java.util.*;
import java.io.*;

public class SortAlg {

	int [] b;	// The auxillary array for mergesort

	// Printarray prints an array of ints
	public void printArray(int [] a) {

		for(int i = 0; i < a.length;i++) {
			System.out.print(a[i] + " ");
		}
	}

	// inserts a sentinel value at the place given by p
	public int[] insertsentinel(int [] b, int p) {

		int [] a = new int[b.length+1];
		a[p] = -1;
		for( int j = 0; j < a.length; j++) {
			if(j < p)
				a[j] = b[j];
			else if(j > p)
				a[j] = b[j-1];
		}

		return(a);

	}

	// removes the (hopefully) sentinel value at the place given by p
	public int[] removesentinel(int [] b, int p) {

		int [] a = new int[b.length-1];
		for(int k = 0; k < a.length; k++) {
			if(k < p)
				a[k] = b[k];
			else if(k > p)
				a[k] = b[k+1];
			else
				a[k] = b[k+1];
		}

		return(a);

	}

	// Swap the elements in a at position i and j
	public void swap( int [] a, int i, int j) {
		int t = a[i];
		a[i] = a[j];
		a[j] = t;
	}

	// Insertion sort
	// Based on the Algorithm given in "Algorithms in C++" by Sedgewick
	public void insertion(int [] a, int N) {

		int i,j;
		int v;
		for(i = 2; i <= N; i++) {
			v = a[i];
			j = i;
			while( a[j-1] > v) {
				a[j] = a[j-1];
				j--;
			}
			a[j] = v;
		}
	}

	// Quicksort
	// Based on the Algorithm given in "Algorithms in C++" by Sedgewick
	public void quicksort(int [] a, int l, int r) {	
		int i,j;
		int v;

		if( r > l ) {

			v = a[r];
			i = l-1;
			j = r;

			for(;;) {
				while( a[++i] < v ) ;
				while( a[--j] > v) ;
				if ( i >= j)
					break;
				swap(a, i, j);
			}
			swap(a, i, r);

			quicksort(a, l, i-1);
			quicksort(a, i+1, r);
		}
	}



	// Quicksort with median of three pivot
	// The pivot is the median of the highest and lowest element
	public void medof3(int [] a, int l, int r) {
		int i,j;
		int v;

		if( r > l ) {
				// Here we determine the median element and swap the largest of the three elements to r
				int mid = (l+r)/2;
				if( a[l] > a[mid] )
					swap( a, l, mid );
				if( a[l] > a[r] )
					swap( a, l, r );
				if( a[mid] > a[r] )
					swap( a, mid, r );
			swap(a,mid,r-1);
			v = a[r];
			i = l;
			j = r;
			for(;;) {
				while( a[++i] < v ) ;
				while( a[--j] > v) ;
				if ( i >= j)
					break;
				swap(a, i, j);

			}
			swap(a, i, r);
			medof3(a, l, i-1);
			medof3(a, i+1, r);

		}
	}

	// Quicksort with median of three and insertion sort when less than 10 elements are in a subfile
	void quickandinsert(int a[], int l, int r) {
		int i,j;
		int v;

		if( (r-l) <= 10) {
			// If there are less than 10 elements, do insertion sort for the subfile
			for(i=l+1; i<=r; ++i){ 
				v=a[i]; 
				for(j=i-1; j>=l && v<a[j]; --j)
					a[j+1]=a[j]; 
				a[j+1]=v;
			 } 

		}
		else if( r > l ) {
				// Here we determine the median element and swap the largest of the three elements to r
				int mid = (l+r)/2;
				if( a[l] > a[mid] )
					swap( a, l, mid );
				if( a[l] > a[r] )
					swap( a, l, r );
				if( a[mid] > a[r] )
					swap( a, mid, r );
			swap(a,mid,r-1);
			v = a[r];
			i = l;
			j = r;
			for(;;) {
				while( a[++i] < v ) ;
				while( a[--j] > v) ;
				if ( i >= j)
					break;
				swap(a, i, j);

			}
			swap(a, i, r);
			quickandinsert(a, l, i-1);
			quickandinsert(a, i+1, r);

		}

	}

	// Dynamic Quicksort
	// Based on the Algorithm given in "Algorithms in C++" by Sedgewick
	public void dynquick(int [] a, int l, int r) {
		int i,j;
		int v;

		Stack sf = new Stack();
		for(;;) {
			while( r > l ) {

				v = a[r];
				i = l-1;;
				j = r;

				for(;;) {
					while( a[++i] < v ) ;
					while( a[--j] > v) ;
					if ( i >= j)
						break;
					swap(a, i, j);
				}

				swap(a, i, r);

				if( i-l > r - i) {
					sf.push( new Integer(l) );
					sf.push( new Integer(i-1) );
					l = i + 1;
				}
				else {
					sf.push( new Integer(i+1) );
					sf.push( new Integer(r) );
					r = i-1;
				}
			}

			if( sf.empty() )
				break;

			r = ( (Integer)sf.pop() ).intValue();
			l = ( (Integer)sf.pop() ).intValue();
		}
	}

	// In this method we initialize b (the auxilary array) to the length of a
	public void mergesort(int [] a, int l, int r) {
		b = new int[a.length];
		merge(a,l,r);
	}

	// The actual mergesort implementation
	// Based on the Algorithm given in "Algorithms in C++" by Sedgewick
	public void merge(int [] a, int l, int r) {
		int i, j, k, m;

		if( r > l ) {
			m = (r + l)/2;
			merge(a, l, m);
			merge(a, m+1, r);
			for( i = m+1; i > l; i-- )
				b[i-1] = a[i-1];
			for( j = m; j < r; j++ )
				b[r+m-j] = a[j+1];
			for( k = l; k <= r; k++) {
				if( b[i] <= b[j] )
					a[k] = b[i++];
				else
					a[k] = b[j--];
			}
		}
	}

}