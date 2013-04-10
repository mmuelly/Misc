// ***********************************************
// Michael C. Muelly, 2004
// ***********************************************

import java.util.*;
import java.io.*;


public class DLBtrie {

	// This is the pointer to the initial node of the trie
	protected DLBnode firstNode;
	protected char terminator = '$';	

	// For the first insert firstNode needs to be initialized before DLBInsert can be called
	public void firstInsert(String newWord) {
	
		firstNode = new DLBnode(newWord.charAt(0), null, null);
		DLBinsert( newWord,0,firstNode );
	}

	// insert determines whether the insert is the first one and calls the appropriate function
	public void insert(String newWord) {

		if(firstNode == null) {
			firstInsert(newWord);
		}
		else {
			DLBinsert(newWord,0,firstNode);
		}
	}

	// DLBinsert inserts the letter at position stringPos in the correct place if needed
	public void DLBinsert(String newWord, int stringPos, DLBnode cur) {

		// If we are not at the last letter yet, then try to find the letter
		// If letter was found then call function with next position,
		// otherwise create a new dlbnode for the letter, and then call the function again.
		if( stringPos < newWord.length() ) {

			while(cur.silbling != null) {
				if( cur.value == newWord.charAt(stringPos) ) {
					if(cur.child == null && stringPos+1 < newWord.length() ) {
						cur.child = new DLBnode( newWord.charAt(stringPos+1), null, null );
						DLBinsert(newWord,stringPos+1,cur.child);						
					}
					else if(cur.child == null) {
						cur.child = new DLBnode(terminator, null, null);
					}
					else if(cur.child != null) {
						DLBinsert(newWord,stringPos+1,cur.child);
					}
				}


				cur = cur.silbling;
			}

			if( cur.silbling == null && cur.value != newWord.charAt(stringPos) ) {
				cur.silbling = new DLBnode(newWord.charAt(stringPos), null, null);
				DLBinsert(newWord,stringPos,cur.silbling);
			}

			if( cur.silbling == null && cur.value == newWord.charAt(stringPos) ) {
				if(cur.child == null && stringPos+1 < newWord.length() ) {
					cur.child = new DLBnode( newWord.charAt(stringPos+1), null, null );
					DLBinsert(newWord,stringPos+1,cur.child);						
				}
				else if(cur.child == null) {
					cur.child = new DLBnode(terminator, null, null);
				}
				else if(cur.child != null) {
					DLBinsert(newWord,stringPos+1,cur.child);
				}
			}

		}

		// At the end of the string we insert the terminator 
		else {
	
			if( cur.child == null ) {
				cur.child = new DLBnode(terminator, null, null);
			}
			else if( cur.child != null && cur.child.value != terminator) {
				cur.silbling = new DLBnode(terminator, null, null);
			}

		}

	}



	// findString calls DLBfindString with the initial parameters
	// The following values are returned: 1 if a word is found, 0 if a prefix but not word is found, -1 if the prefix does not exist
	public int findString(String word) {
		return( DLBfindString(word,0,firstNode) );

	}

	// DLBfindString finds a string in the dictionary and determines whether it is a word or a prefix
	// The following values are returned: 1 if a word is found, 0 if a prefix but not word is found, -1 if the prefix does not exist
	public int DLBfindString(String word, int stringPos, DLBnode cur) {

		int current;

		if( stringPos < word.length() ) {

			while(cur.silbling != null) {
				if( cur.value == word.charAt(stringPos) ) {
					current = DLBfindString(word,stringPos+1,cur.child);
					if( current == 0 ) {
						return( 0 );
					}
					else if( current == 1 ) {
						return( 1 );
					}
					else {
						return( -1 );
					}
				}
	
				cur = cur.silbling;
			}
			if( cur.silbling == null && cur.value == word.charAt(stringPos) ) {
				current = DLBfindString(word,stringPos+1,cur.child);
				if( current == 0 ) {
						return( 0 );
					}
					else if( current == 1 ) {
						return( 1 );
					}
					else {
						return( -1 );
					}
			}
			else {
				return( -1 );
			}
		}
		else {
			if( cur.value == terminator )
				return( 1 );		

			return( 0 );
		}

	}


}