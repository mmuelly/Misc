// ***********************************************
// Michael C. Muelly, 2004
// ***********************************************

// This is a single node being used to store the characters for the dictionary

public class DLBnode {
	public char value;
	public DLBnode silbling;
	public DLBnode child;

	public DLBnode(char nodeValue, DLBnode silbling, DLBnode child) {
		this.value = nodeValue;
		this.silbling = silbling;
		this.child = child;
	}
}
