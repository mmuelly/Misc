// ***********************************************
// Michael C. Muelly, 2004
// ***********************************************

import java.util.*;
import java.io.*;


public class Assig1 {

	String dictfile = "dict10.txt";			// Name of file containing the words for the dictionary

	DLBtrie dictionary = new DLBtrie();		// Contains the dictionary of words
	Vector solution = new Vector();			// Contains all solutions for the anagram


	public static void main(String[] args) {

		Assig1 main = new Assig1();

	}

	Assig1() {


		// Read in dictionary and create DLB dictionary trie
		try {
			File srcFile = new File(dictfile);
			BufferedReader in = new BufferedReader(new FileReader(srcFile));

			while (in.ready())
			{
				dictionary.insert(in.readLine());
			}

			in.close();
		}
		catch (Exception e)
		{
			System.err.println("File input error");
		}

		// Ask user for the input file
		String filename = "data1.in";
		System.out.println("Please enter the name of the file to be read: ");

		// Read in file name from user
		try {
			BufferedReader stdin = new BufferedReader( new InputStreamReader( System.in ) );
			filename = stdin.readLine();
		}
		catch(Exception e) {}
		System.out.println();
		System.out.println("Finding Anagrams, please wait... ");


		Vector word = new Vector();		// Contains the original word
		Vector perm = new Vector();		// Used to generate the permutations
		Vector partial = new Vector();		// Vector of words for multiple words in one comb.

		// Read in the file with the anagrams
		try {
			// Prepare to read input file
			File srcFile = new File(filename);
			BufferedReader in = new BufferedReader(new FileReader(srcFile));

			// Prepare to write to output file
			FileWriter dest = new FileWriter( filename + ".out", false );
			PrintWriter output = new PrintWriter( dest, true );

			// Every line contains a different word to generate anagrams for
			while (in.ready())
			{
				// Empty all the vectors
				word = new Vector();
				perm = new Vector();
				partial = new Vector();
				solution = new Vector();
				// Read in current word
				String begin = in.readLine();

				// Remove all whitespaces from begin and make it lowercase
				String[] result = begin.split("\\s");
				String temp ="";
     				for (int x=0; x<result.length; x++) {
        	 			temp += result[x];
				}
				begin = temp.toLowerCase();

				// Put the characters in a vector
				for( int b = 0; b < begin.length(); b++) {
					word.add( String.valueOf( begin.charAt(b) ) );
					perm.add("");
				}

				// Call the function to find the anagrams
				addLetter(word,perm,partial);

				// Write them to the output file after preparing them
				output.println( prepareSolution( solution ) );


			}

			// Close all open files
			output.flush();
			output.close();
			in.close();

			System.out.println("The anagrams found have been written to the file: " + filename + ".out");
		}
		catch (Exception e)
		{
			System.out.println(e);
			//System.err.println("File input error");
		}

	}

	// This recursive function finds the anagrams
	public void addLetter(Vector word, Vector perm, Vector partial) {

		// To prevent manipulating the original objects we create a new one
		// and assign the elements from the old one to the new one
		Vector newword = new Vector();
		Vector newperm = new Vector();
		Vector newpartial = new Vector();
		Vector newpartial2 = new Vector();
		for(int b = 0; b < word.size(); b++) {
			newword.add( word.elementAt( b ) );
		}
		for(int d = 0; d < perm.size(); d++) {
			newperm.add( perm.elementAt( d ) );
		}
		for(int d = 0; d < partial.size(); d++) {
			newpartial.add( partial.elementAt( d ) );
			newpartial2.add( partial.elementAt( d ) );
		}


		// We want to get all possible combinations, thus the loop
		for(int c = 0; c < newword.size(); c++) {

			//
			if( !( newword.elementAt(c).equals("") ) ) {

				int f = 0;
				while( f < newperm.size() && !newperm.elementAt(f).equals("") ) {
					f++;
				}

				if( f < newperm.size() ) {
					newperm.setElementAt( newword.elementAt(c),f);
					newword.setElementAt( "", c);
				}

				// If the string is a prefix call addletter again
				if( dictionary.findString( toString( newperm, "" ) ) == 0 ) {
					addLetter(newword,newperm,newpartial);

				}
				else if( dictionary.findString( toString( newperm, "" ) ) == 1 && toString( newperm, "" ).length() > 1 ) {
					// Found a word!

					// If it uses all the letters, print it out!!
					if ( toString( newword, "" ).length() == 0 ) {
						newpartial.add( toString( newperm, "" ) );
						solution.add( toString( newpartial, " " ) );
						//System.out.println( newpartial );

					}

					// Otherwise, continue making recursions
					else {

					//start a new call to add with remaining letters, adding current word to the partial list
						newpartial.add( toString(newperm, "" ) );

						// Here we put the remaining newword letters in a new vector


						Vector nextword = new Vector();
						Vector nextperm = new Vector();
						for(int j = 0; j < newword.size(); j++) {

							if( !newword.elementAt(j).equals("") ) {
								nextword.add( newword.elementAt(j) );
								nextperm.add( "" );
							}
						}

					addLetter(nextword,nextperm,newpartial); // Call new "branch" to "start over"

					//Continue to look for larger words with that prefix
					addLetter(newword,newperm,newpartial2);

					newpartial.removeElementAt(newpartial.size()-1);
					}


				}
				// If a word with just one letter was found, treat it like a prefix
				else if( dictionary.findString( toString( newperm, "" ) ) == 1 ) {
					addLetter(newword,newperm,newpartial);
				}

				newword.setElementAt( newperm.elementAt(f), c);
				newperm.setElementAt( "", f);


			}

		}

	}



	// toString takes a vector with string elements and creates one big string
	// the second parameter is the string that the vector elements should be seperated by
	public String toString(Vector word, String cr) {

		String prefix = "";

				for(int d=0; d<word.size(); d++) {
					if( !word.elementAt(d).equals("") ) {
						prefix = prefix + word.elementAt(d) + cr;
					}
				}
		return(prefix);

	}

	// Preparesolution sorts the found anagrams by number of words and then calls sort to sort them lexographically
	// then duplicates are removed and the resulting vectors changed to string
	public String prepareSolution(Vector solution) {
		String result = "";
		Vector allsolution = new Vector();

		String word = "";
		int spaces=0;
		for(int c = 0; c < solution.size(); c++) {
			word = (String)solution.elementAt(c);
			spaces=0;
			for(int d = 0; d < word.length(); d++) {
				if( word.charAt(d) == ' ' )
					spaces++;
			}
			if( allsolution.size() < spaces ) {
				while( allsolution.size() <= spaces ) {
					allsolution.add( new Vector() );
				}
			}
			( (Vector) allsolution.elementAt(spaces) ).add(word);

		}

		for(int c = 0; c < allsolution.size(); c++) {
			sort( (Vector) allsolution.elementAt(c) );
			removeDuplicates( (Vector) allsolution.elementAt(c) );
			result = result + toString( (Vector) allsolution.elementAt(c), "\n" );
		}

		return(result);


	}


	// Sorts a vector using the compareTo method, so that all statements are in lexicographical order.
	public void sort(Vector elements) {

		String element1;
		String element2;
		int min, d;

		for(int c=0;c < elements.size()-1;c++) {

			min = c;

			for(d = c + 1;d < elements.size();d++) {

				element1 = (String) elements.elementAt(min);
				element2 = (String) elements.elementAt(d);
				if(element1.compareTo(element2) > 0) {
					min = d;
				}
				if(min != c) {
					element1 = (String) elements.elementAt(min);
					element2 = (String) elements.elementAt(c);
					elements.setElementAt(element1,c);
					elements.setElementAt(element2,min);
				}
			}

            	}

	}

	// Removes duplicates in a vector
	public void removeDuplicates(Vector elements) {

		String element1 = "";
		for(int c = 0; c < elements.size(); c++) {

			if( !((String)elements.elementAt(c)).equals(element1) ) {
				element1 = ((String)elements.elementAt(c));
			}
			else {
				elements.removeElementAt(c);
			}
		}

	}



}