// ***********************************************
// Michael C. Muelly
// ***********************************************

// The timer class allows to time program runtime

public class Timer {
	static long startTime;
	static long totalTime;

	static final void start() {
		startTime=System.currentTimeMillis();
	}
	static final void stop() {
		startTime-=System.currentTimeMillis();
		totalTime = totalTime + (-1*startTime);
	}
	static final void reset() {
		startTime=0;
		totalTime=0;
	}
	static final long report() {
		return(totalTime);
	}
}
