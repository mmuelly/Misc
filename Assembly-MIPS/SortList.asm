# Assembly sort (MIPS)
# Michael Muelly, 2003

	.data
before:	.asciiz "Before Sort:\n"
after:	.asciiz "After Sort:\n"
space:	.asciiz " "
eol:	.asciiz "\n"
list:	.word 7, 9, 4, 3, 8, 1, 6, 2, 5

	.text
main:	addi	$s3,$zero,9		# The list contains 9 numbers
	la	$s2, list

	move	$s0, $zero
for1tst:slt	$t0, $s0, $s3
	beq	$t0, $zero, exit1

	addi	$s1, $s0, -1
for2tst:slti	$t0, $s1, 0
	bne	$t0, $zero, exit2
	add	$t1, $s1, $s1
	add	$t1, $t1, $t1
	add	$t2, $s2, $t1
	lw	$t3, 0($t2)
	lw	$t4, 4($t2)
	slt	$t0, $t4, $t3
	beq	$t0, $zero, exit2

	move	$a0, $s2
	move	$a1, $s1
	jal swap

	addi	$s1, $s1, -1
	j	for2tst

exit2:	addi	$s0, $s0, 1
	j	for1tst
exit1:	li	$v0, 10			# Exit program
	syscall


swap:	add	$t1, $a1, $a1
	add	$t1, $t1, $t1
	add	$t1, $a0, $t1

	lw	$t0, 0($t1)
	lw	$t2, 4($t1)

	sw	$t2, 0($t1)
	sw	$t0, 4($t1)
	jr	$ra